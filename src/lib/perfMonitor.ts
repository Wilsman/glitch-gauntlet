import Konva from "konva";

// Lightweight in-game performance monitor. It always collects while a game page is mounted (a few timestamps
// per frame), so a player can export a log after noticing a problem even if the overlay was off.

export type PerfOverlayMode = "off" | "fps" | "extras" | "full";
export const PERF_OVERLAY_MODES: { id: PerfOverlayMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "fps", label: "FPS" },
  { id: "extras", label: "FPS+" },
  { id: "full", label: "Full" },
];

export interface PerfContext {
  mode?: string;
  stage?: number;
  modifier?: string | null;
  phase?: string;
  status?: string;
  paused?: boolean;
  enemies?: number;
  projectiles?: number;
  particles?: number;
  fx?: number;
  hazards?: number;
  fireTrails?: number;
}

export interface PerfSecond {
  /** Seconds since the monitor started. */
  t: number;
  fps: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  longTasks: number;
  longTaskMs: number;
  /** Average per call, in ms. */
  simMs: number;
  publishMs: number;
  renderMs: number;
  drawMs: number;
  heapMB: number | null;
  ctx: PerfContext;
}

export interface PerfLive {
  fps: number;
  avgMs: number;
  p95Ms: number;
  low1Fps: number;
  maxMs: number;
  simMs: number;
  publishMs: number;
  renderMs: number;
  drawMs: number;
  longTasks: number;
  heapMB: number | null;
  hitches: number;
  ctx: PerfContext;
  frameTimes: number[];
}

const MODE_KEY = "glitch-gauntlet:perf-overlay";
const MAX_SECONDS = 3600;
const MAX_HITCHES = 500;
const MAX_MARKERS = 300;
const HITCH_MS = 50;
const RECENT_FRAMES = 240;

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const percentile = (sorted: number[], p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);
const heapMB = () => {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? round(memory.usedJSHeapSize / 1048576, 1) : null;
};

class Timing {
  total = 0;
  count = 0;
  add(ms: number) { this.total += ms; this.count++; }
  avg() { return this.count ? this.total / this.count : 0; }
  reset() { this.total = 0; this.count = 0; }
}

class PerfMonitor {
  private running = false;
  private raf = 0;
  private startedAt = 0;
  private lastFrame = 0;
  private secondStart = 0;
  private secondFrames: number[] = [];
  private recent: number[] = [];
  private sim = new Timing();
  private publish = new Timing();
  private render = new Timing();
  private draw = new Timing();
  private secondLongTasks = 0;
  private secondLongTaskMs = 0;
  private longTaskObserver: PerformanceObserver | null = null;
  private seconds: PerfSecond[] = [];
  private hitches: { t: number; frameMs: number; ctx: PerfContext }[] = [];
  private markers: { t: number; label: string }[] = [];
  private lastCtx: PerfContext = {};
  private contextProvider: (() => PerfContext) | null = null;
  private listeners = new Set<() => void>();
  private mode: PerfOverlayMode = "off";
  private modeListeners = new Set<(mode: PerfOverlayMode) => void>();
  private drawPatched = false;

  constructor() {
    try {
      const saved = localStorage.getItem(MODE_KEY) as PerfOverlayMode | null;
      if (saved && PERF_OVERLAY_MODES.some((m) => m.id === saved)) this.mode = saved;
    } catch {
      // Storage can be unavailable (private mode); the overlay simply starts off.
    }
  }

  start() {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    this.patchKonvaDraw();
    const now = performance.now();
    if (!this.startedAt) this.startedAt = now;
    this.lastFrame = now;
    this.secondStart = now;
    this.mark("monitor started");
    if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("longtask")) {
      this.longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) { this.secondLongTasks++; this.secondLongTaskMs += entry.duration; }
      });
      this.longTaskObserver.observe({ type: "longtask" });
    }
    const frame = (ts: number) => {
      if (!this.running) return;
      this.onFrame(ts);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
    this.mark("monitor stopped");
  }

  /** Supplies game context (stage, counts, …) sampled once per second and attached to hitches. */
  setContextProvider(provider: (() => PerfContext) | null) {
    this.contextProvider = provider;
  }

  recordSim(ms: number) { this.sim.add(ms); }
  recordPublish(ms: number) { this.publish.add(ms); }
  recordRender(ms: number) { this.render.add(ms); }

  mark(label: string) {
    this.markers.push({ t: this.elapsed(), label });
    if (this.markers.length > MAX_MARKERS) this.markers.shift();
  }

  getMode() { return this.mode; }
  setMode(mode: PerfOverlayMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* not persisted */ }
    this.modeListeners.forEach((listener) => listener(mode));
  }
  cycleMode() {
    const index = PERF_OVERLAY_MODES.findIndex((m) => m.id === this.mode);
    this.setMode(PERF_OVERLAY_MODES[(index + 1) % PERF_OVERLAY_MODES.length].id);
  }
  onModeChange(listener: (mode: PerfOverlayMode) => void) {
    this.modeListeners.add(listener);
    return () => { this.modeListeners.delete(listener); };
  }

  /** Called once per completed second. */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getLive(): PerfLive {
    const frames = this.recent.slice(-60);
    const sorted = [...this.recent].sort((a, b) => a - b);
    const avg = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 0;
    const worst1 = sorted.slice(Math.floor(sorted.length * 0.99));
    const low1 = worst1.length ? worst1.reduce((a, b) => a + b, 0) / worst1.length : 0;
    const last = this.seconds[this.seconds.length - 1];
    return {
      fps: avg ? round(1000 / avg, 0) : 0,
      avgMs: round(avg, 1),
      p95Ms: round(percentile(sorted, 0.95), 1),
      low1Fps: low1 ? round(1000 / low1, 0) : 0,
      maxMs: round(sorted[sorted.length - 1] || 0, 1),
      simMs: last?.simMs ?? 0,
      publishMs: last?.publishMs ?? 0,
      renderMs: last?.renderMs ?? 0,
      drawMs: last?.drawMs ?? 0,
      longTasks: last?.longTasks ?? 0,
      heapMB: last?.heapMB ?? heapMB(),
      hitches: this.hitches.length,
      ctx: this.lastCtx,
      frameTimes: this.recent.slice(-120),
    };
  }

  clear() {
    this.seconds = [];
    this.hitches = [];
    this.markers = [];
    this.recent = [];
    this.startedAt = performance.now();
    this.mark("log cleared");
  }

  buildLog() {
    const seconds = this.seconds;
    const fpsValues = seconds.map((s) => s.fps);
    const sortedFps = [...fpsValues].sort((a, b) => a - b);
    const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
    return {
      format: "glitch-gauntlet-perf-log",
      version: 1,
      exportedAt: new Date().toISOString(),
      url: location.pathname + location.search,
      environment: environmentInfo(),
      summary: {
        seconds: seconds.length,
        avgFps: round(mean(fpsValues), 1),
        medianFps: percentile(sortedFps, 0.5),
        worst5PctFps: percentile(sortedFps, 0.05),
        secondsBelow55: fpsValues.filter((f) => f < 55).length,
        secondsBelow30: fpsValues.filter((f) => f < 30).length,
        hitches: this.hitches.length,
        worstFrameMs: round(Math.max(0, ...seconds.map((s) => s.maxMs)), 1),
        avgSimMs: round(mean(seconds.map((s) => s.simMs)), 3),
        avgRenderMs: round(mean(seconds.map((s) => s.renderMs)), 3),
        avgDrawMs: round(mean(seconds.map((s) => s.drawMs)), 3),
        worstSeconds: [...seconds].sort((a, b) => a.fps - b.fps).slice(0, 10),
      },
      markers: this.markers,
      hitches: this.hitches,
      seconds,
    };
  }

  exportLog() {
    const log = this.buildLog();
    const blob = new Blob([JSON.stringify(log, null, 1)], { type: "application/json" });
    const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `glitch-gauntlet-perf-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    this.mark("log exported");
  }

  private elapsed() {
    return this.startedAt ? round((performance.now() - this.startedAt) / 1000, 2) : 0;
  }

  private onFrame(ts: number) {
    const delta = ts - this.lastFrame;
    this.lastFrame = ts;
    // Hidden tabs stop rAF; the gap on return is not a frame.
    if (delta > 0 && delta < 1000) {
      this.secondFrames.push(delta);
      this.recent.push(delta);
      if (this.recent.length > RECENT_FRAMES) this.recent.shift();
      if (delta > HITCH_MS) {
        this.hitches.push({ t: this.elapsed(), frameMs: round(delta, 1), ctx: this.lastCtx });
        if (this.hitches.length > MAX_HITCHES) this.hitches.shift();
      }
    }
    if (ts - this.secondStart >= 1000) this.closeSecond(ts);
  }

  private closeSecond(ts: number) {
    const frames = this.secondFrames;
    const sorted = [...frames].sort((a, b) => a - b);
    const ctx = this.readContext();
    const sample: PerfSecond = {
      t: this.elapsed(),
      fps: round((frames.length * 1000) / (ts - this.secondStart), 0),
      avgMs: round(frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length), 2),
      p95Ms: round(percentile(sorted, 0.95), 1),
      maxMs: round(sorted[sorted.length - 1] || 0, 1),
      longTasks: this.secondLongTasks,
      longTaskMs: round(this.secondLongTaskMs, 0),
      simMs: round(this.sim.avg(), 3),
      publishMs: round(this.publish.avg(), 3),
      renderMs: round(this.render.avg(), 3),
      drawMs: round(this.draw.avg(), 3),
      heapMB: heapMB(),
      ctx,
    };
    this.seconds.push(sample);
    if (this.seconds.length > MAX_SECONDS) this.seconds.shift();
    this.secondFrames = [];
    this.secondStart = ts;
    this.secondLongTasks = 0;
    this.secondLongTaskMs = 0;
    this.sim.reset(); this.publish.reset(); this.render.reset(); this.draw.reset();
    this.listeners.forEach((listener) => listener());
  }

  private readContext(): PerfContext {
    let ctx: PerfContext = {};
    try { ctx = this.contextProvider?.() ?? {}; } catch { /* context is best-effort */ }
    const prev = this.lastCtx;
    if (ctx.stage !== prev.stage || ctx.modifier !== prev.modifier) this.mark(`stage ${ctx.stage ?? "-"}${ctx.modifier ? ` (${ctx.modifier})` : ""}`);
    if (ctx.phase !== prev.phase && ctx.phase) this.mark(`phase ${ctx.phase}`);
    if (ctx.paused !== prev.paused && prev.paused !== undefined) this.mark(ctx.paused ? "paused" : "resumed");
    this.lastCtx = ctx;
    return ctx;
  }

  // Times every Konva layer draw (one per changed layer per frame).
  private patchKonvaDraw() {
    if (this.drawPatched) return;
    this.drawPatched = true;
    const layerDraw = Konva.Layer.prototype.drawScene;
    const draw = this.draw;
    Konva.Layer.prototype.drawScene = function (this: Konva.Layer, ...args: Parameters<typeof layerDraw>) {
      const t = performance.now();
      const result = layerDraw.apply(this, args);
      draw.add(performance.now() - t);
      return result;
    };
  }
}

function environmentInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  let gpu: string | null = null;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    gpu = gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gl ? String(gl.getParameter(gl.RENDERER)) : "webgl unavailable";
  } catch {
    gpu = null;
  }
  const canvases = Array.from(document.querySelectorAll("canvas")).map((c) => `${c.width}x${c.height}`);
  return {
    userAgent: nav.userAgent,
    platform: nav.platform,
    language: nav.language,
    cpuThreads: nav.hardwareConcurrency ?? null,
    deviceMemoryGB: nav.deviceMemory ?? null,
    gpu,
    devicePixelRatio: window.devicePixelRatio,
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    fullscreen: !!document.fullscreenElement,
    canvases,
    buildMode: import.meta.env.MODE,
  };
}

export const perfMonitor = new PerfMonitor();
