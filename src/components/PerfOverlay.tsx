import { useEffect, useRef, useState, type ReactNode } from "react";
import { Activity, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERF_OVERLAY_MODES, perfMonitor, type PerfLive } from "@/lib/perfMonitor";
import { exportPerfLog, usePerfOverlayMode } from "@/hooks/usePerfOverlay";

const fpsColor = (fps: number) => (fps >= 55 ? "text-emerald-300" : fps >= 30 ? "text-yellow-300" : "text-rose-400");
const ms = (n: number) => n.toFixed(n < 10 ? 2 : 1);

function FrameGraph({ frames }: { frames: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const w = 226, h = 44, top = 50; // graph spans 0-50ms
    ctx.clearRect(0, 0, w, h);
    const y = (v: number) => h - (Math.min(v, top) / top) * h;
    ctx.fillStyle = "rgba(148,163,184,0.25)";
    ctx.fillRect(0, Math.round(y(16.7)), w, 1);
    ctx.fillRect(0, Math.round(y(33.3)), w, 1);
    const bar = w / Math.max(1, frames.length);
    frames.forEach((v, i) => {
      ctx.fillStyle = v > 33.4 ? "#fb7185" : v > 17.5 ? "#fde047" : "#6ee7b7";
      const barTop = y(v);
      ctx.fillRect(i * bar, barTop, Math.max(1, bar - 0.5), h - barTop);
    });
  }, [frames]);
  return <canvas ref={ref} width={226} height={44} className="mt-1.5 block rounded-sm bg-black/40" aria-label="Recent frame times" />;
}

/** On-screen performance readout. F3 cycles Off → FPS → FPS+ → Full. */
export default function PerfOverlay() {
  const mode = usePerfOverlayMode();
  const [live, setLive] = useState<PerfLive | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "F3") return;
      e.preventDefault();
      perfMonitor.cycleMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mode === "off") return;
    const update = () => setLive(perfMonitor.getLive());
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [mode]);

  if (mode === "off" || !live) return null;

  if (mode === "fps") {
    return (
      <div className="pointer-events-none fixed left-4 top-14 z-40 rounded-md border border-white/10 bg-slate-950/85 px-2 py-1 font-mono text-xs" data-testid="perf-overlay">
        <span className={cn("font-bold", fpsColor(live.fps))}>{live.fps}</span> <span className="text-slate-400">FPS</span>
      </div>
    );
  }

  const ctx = live.ctx;
  const row = (label: string, value: ReactNode) => (
    <>
      <span className="text-slate-500">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </>
  );
  return (
    <div
      className={cn(
        "fixed left-4 top-14 z-40 w-[248px] rounded-md border border-white/10 bg-slate-950/85 px-2.5 py-2 font-mono text-[11px] leading-[1.5] text-slate-300",
        mode === "full" ? "pointer-events-auto" : "pointer-events-none",
      )}
      data-testid="perf-overlay"
    >
      <div className="flex items-baseline justify-between">
        <span>
          <span className={cn("text-base font-bold", fpsColor(live.fps))}>{live.fps}</span> <span className="text-slate-400">FPS</span>
        </span>
        <span className="text-slate-400">
          1% low <span className={fpsColor(live.low1Fps)}>{live.low1Fps}</span>
        </span>
      </div>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
        {row("frame", `${ms(live.avgMs)} ms`)}
        {row("p95 / max", `${ms(live.p95Ms)} / ${ms(live.maxMs)} ms`)}
        {row("sim", `${ms(live.simMs)} ms`)}
        {row("render", `${ms(live.renderMs)} ms`)}
        {row("draw", `${ms(live.drawMs)} ms`)}
        {mode === "full" && (
          <>
            {row("publish", `${ms(live.publishMs)} ms`)}
            {row("long tasks", `${live.longTasks}/s`)}
            {row("heap", live.heapMB === null ? "n/a" : `${live.heapMB} MB`)}
            {row("hitches", `${live.hitches} (>50ms)`)}
          </>
        )}
      </div>
      {mode === "full" && (
        <>
          <FrameGraph frames={live.frameTimes} />
          <div className="mt-1.5 border-t border-white/10 pt-1 text-slate-400">
            {ctx.stage !== undefined ? `stage ${ctx.stage}${ctx.modifier ? ` · ${ctx.modifier}` : ""}` : ctx.mode || "game"}
            {ctx.phase ? ` · ${ctx.phase}` : ctx.status ? ` · ${ctx.status}` : ""}
            {ctx.paused ? " · paused" : ""}
          </div>
          <div className="text-slate-400">
            enemies {ctx.enemies ?? 0} · proj {ctx.projectiles ?? 0} · parts {ctx.particles ?? 0}
          </div>
          <div className="text-slate-400">
            fx {ctx.fx ?? 0} · hazards {ctx.hazards ?? 0} · fire {ctx.fireTrails ?? 0} · dpr {window.devicePixelRatio}
          </div>
          <div className="mt-1.5 flex gap-1.5">
            <Button size="sm" variant="outline" className="h-7 flex-1 border-cyan-400/50 bg-transparent px-2 font-mono text-[10px] text-cyan-200 hover:bg-cyan-400 hover:text-black" onClick={exportPerfLog}>
              <Download className="h-3 w-3" /> Export log
            </Button>
            <Button size="sm" variant="outline" className="h-7 border-white/20 bg-transparent px-2 font-mono text-[10px] text-slate-300 hover:bg-white/20" onClick={() => perfMonitor.clear()} aria-label="Clear performance log">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="mt-1 text-[10px] text-slate-500">F3 cycles overlay</div>
        </>
      )}
    </div>
  );
}

/** Overlay mode picker + log export, for the settings panel and pause menu. */
export function PerformanceSettings() {
  const mode = usePerfOverlayMode();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-neon-cyan">
        <Activity className="h-4 w-4" />
        <span className="font-press-start text-[9px] uppercase tracking-[0.25em]">Performance</span>
      </div>
      <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Performance overlay">
        {PERF_OVERLAY_MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === option.id}
            onClick={() => perfMonitor.setMode(option.id)}
            className={cn(
              "rounded border px-1 py-1.5 font-press-start text-[8px] uppercase transition-colors",
              mode === option.id ? "border-neon-cyan bg-neon-cyan/20 text-neon-cyan" : "border-white/15 text-white/60 hover:border-white/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={exportPerfLog}
        className="h-8 w-full border-neon-cyan/50 bg-transparent font-press-start text-[8px] uppercase text-neon-cyan hover:bg-neon-cyan hover:text-black"
      >
        <Download className="h-3 w-3" /> Export performance log
      </Button>
      <p className="font-vt323 text-lg leading-5 text-white/60">
        F3 cycles the overlay in game. The log covers up to the last hour of play.
      </p>
    </div>
  );
}
