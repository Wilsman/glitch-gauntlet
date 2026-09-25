import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type ParticleKind = "square" | "spark" | "confetti" | "ring" | "emoji";

export interface BurstOptions {
  color: string;
  accent?: string;
  count: number;
  speed: number;
  kind: ParticleKind;
  text?: string;
}

export interface CardEmitter {
  rect: DOMRect;
  color: string;
  accent: string;
  tier: number;
  intensity: number;
}

export interface UpgradeParticlesHandle {
  burst: (x: number, y: number, opts: BurstOptions) => void;
  setEmitters: (emitters: CardEmitter[]) => void;
  setAmbient: (color: string, tier: number) => void;
}

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  text: string;
  rotation: number;
  vr: number;
  radius: number;
  ember: boolean;
  seed: number;
}

const MAX_PARTICLES = 1200;
const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const COUNT_SCALE = REDUCED ? 0.2 : 1;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeParticle(p: Partial<Particle> & { kind: ParticleKind }): Particle {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0.8,
    size: 4,
    color: "#fff",
    text: "",
    rotation: 0,
    vr: 0,
    radius: 0,
    ember: false,
    seed: 0,
    ...p,
  };
}

function drawList(
  ctx: CanvasRenderingContext2D,
  list: Particle[],
  dt: number,
  dpr: number,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      list.splice(i, 1);
      continue;
    }
    const t = p.life / p.maxLife;
    // embers fade in over the first 15% of life, then fade out
    const alpha = p.ember ? Math.min(t / 0.15, 1) * (1 - t) : 1 - t;
    if (p.kind === "ring") {
      p.radius += p.vx * dt;
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, 5 * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (p.ember) {
      p.vy += -15 * dt; // gentle upward float
      p.vx += Math.sin(p.life * 3 + p.seed) * 26 * dt; // sway
    } else {
      const gravity = p.kind === "confetti" ? 260 : 420;
      const drag = p.kind === "spark" ? 0.9 : 0.985;
      p.vy += gravity * dt;
      p.vx *= drag;
      p.vy *= drag;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.vr * dt;
    ctx.globalAlpha = alpha;
    if (p.kind === "spark") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
    } else if (p.kind === "confetti") {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else if (p.kind === "emoji") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    } else {
      const s = Math.round(p.size);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Owns two canvases: a BACK layer (ambient embers + card edge emitters,
 * rendered behind the cards) and a FRONT layer (bursts/rings/confetti/emoji,
 * rendered above the cards). burst() goes to the front layer.
 */
export const UpgradeParticles = forwardRef<UpgradeParticlesHandle>(
  function UpgradeParticles(_, ref) {
    const backRef = useRef<HTMLCanvasElement>(null);
    const frontRef = useRef<HTMLCanvasElement>(null);
    const frontParticles = useRef<Particle[]>([]);
    const backParticles = useRef<Particle[]>([]);
    const emitters = useRef<CardEmitter[]>([]);
    const emitterAccs = useRef<number[]>([]);
    const ambient = useRef({ color: "#e2e8f0", tier: 0 });
    const ambientAcc = useRef(0);

    useImperativeHandle(ref, () => ({
      burst(x, y, opts) {
        const list = frontParticles.current;
        const count = Math.max(1, Math.round(opts.count * COUNT_SCALE));
        for (let i = 0; i < count; i++) {
          if (list.length >= MAX_PARTICLES) list.shift();
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(0.3, 1) * opts.speed;
          const color =
            opts.accent && Math.random() < 0.4 ? opts.accent : opts.color;
          if (opts.kind === "ring") {
            // rings carry their expansion speed in vx
            list.push(
              makeParticle({
                kind: "ring",
                x,
                y,
                vx: speed,
                maxLife: rand(0.45, 0.7),
                color,
                radius: 6,
              }),
            );
            continue;
          }
          if (opts.kind === "emoji") {
            list.push(
              makeParticle({
                kind: "emoji",
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 120,
                maxLife: rand(0.8, 1.3),
                size: rand(18, 28),
                color,
                text: opts.text || "?",
                rotation: rand(0, Math.PI * 2),
                vr: rand(-6, 6),
              }),
            );
            continue;
          }
          list.push(
            makeParticle({
              kind: opts.kind,
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - (opts.kind === "square" ? 60 : 0),
              maxLife: rand(0.5, opts.kind === "confetti" ? 1.4 : 0.9),
              size:
                opts.kind === "spark" ? rand(6, 14) : Math.round(rand(2, 6)),
              color,
              rotation: rand(0, Math.PI * 2),
              vr: rand(-8, 8),
            }),
          );
        }
      },
      setEmitters(list) {
        emitters.current = list;
        emitterAccs.current = list.map((_, i) => emitterAccs.current[i] || 0);
      },
      setAmbient(color, tier) {
        ambient.current = { color, tier };
      },
    }));

    useEffect(() => {
      const back = backRef.current;
      const front = frontRef.current;
      if (!back || !front) return;
      const bctx = back.getContext("2d");
      const fctx = front.getContext("2d");
      if (!bctx || !fctx) return;
      bctx.imageSmoothingEnabled = false;
      fctx.imageSmoothingEnabled = false;

      let raf = 0;
      let last = performance.now();
      const dpr = () => Math.min(2, window.devicePixelRatio || 1);

      const resize = () => {
        const d = dpr();
        for (const c of [back, front]) {
          c.width = Math.round(window.innerWidth * d);
          c.height = Math.round(window.innerHeight * d);
          c.style.width = `${window.innerWidth}px`;
          c.style.height = `${window.innerHeight}px`;
        }
      };
      resize();
      window.addEventListener("resize", resize);

      const spawnAmbient = () => {
        const list = backParticles.current;
        if (list.length >= MAX_PARTICLES) return;
        list.push(
          makeParticle({
            kind: "square",
            x: Math.round(rand(0, window.innerWidth)),
            y: window.innerHeight + 6,
            vx: rand(-12, 12),
            vy: rand(-70, -30),
            maxLife: rand(1.4, 2.6),
            size: Math.round(rand(2, 4)),
            color: ambient.current.color,
            ember: true,
            seed: rand(0, Math.PI * 2),
          }),
        );
      };

      const spawnEmitter = (e: CardEmitter) => {
        const list = backParticles.current;
        if (list.length >= MAX_PARTICLES) return;
        const { rect } = e;
        // random point on the card perimeter
        const perimeter = 2 * (rect.width + rect.height);
        let d = Math.random() * perimeter;
        let x: number, y: number, nx: number, ny: number;
        if (d < rect.width) {
          x = rect.left + d; y = rect.top; nx = 0; ny = -1;
        } else if ((d -= rect.width) < rect.height) {
          x = rect.right; y = rect.top + d; nx = 1; ny = 0;
        } else if ((d -= rect.height) < rect.width) {
          x = rect.right - d; y = rect.bottom; nx = 0; ny = 1;
        } else {
          d -= rect.width; x = rect.left; y = rect.bottom - d; nx = -1; ny = 0;
        }
        const spark = e.tier >= 2 && Math.random() < 0.35;
        list.push(
          makeParticle({
            kind: spark ? "spark" : "square",
            x: Math.round(x),
            y: Math.round(y),
            vx: nx * rand(20, 90) + rand(-20, 20),
            vy: ny * rand(20, 90) + rand(-40, 0),
            maxLife: rand(0.35, 0.8),
            size: spark ? rand(5, 10) : Math.round(rand(2, 4)),
            color: Math.random() < 0.35 ? e.accent : e.color,
            rotation: rand(0, Math.PI * 2),
            vr: rand(-6, 6),
          }),
        );
      };

      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        // ambient embers: few for tier 0, many for tier 3
        ambientAcc.current += dt * (2 + ambient.current.tier * 10) * COUNT_SCALE;
        while (ambientAcc.current >= 1) {
          ambientAcc.current -= 1;
          spawnAmbient();
        }

        // per-card edge emitters
        emitters.current.forEach((e, i) => {
          emitterAccs.current[i] =
            (emitterAccs.current[i] || 0) +
            dt * e.tier * e.intensity * 8 * COUNT_SCALE;
          while (emitterAccs.current[i] >= 1) {
            emitterAccs.current[i] -= 1;
            spawnEmitter(e);
          }
        });

        drawList(bctx, backParticles.current, dt, dpr());
        drawList(fctx, frontParticles.current, dt, dpr());
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      };
    }, []);

    return (
      <>
        <canvas
          ref={backRef}
          className="pointer-events-none fixed inset-0 z-[5]"
          aria-hidden="true"
        />
        <canvas
          ref={frontRef}
          className="pointer-events-none fixed inset-0 z-[60]"
          aria-hidden="true"
        />
      </>
    );
  },
);
