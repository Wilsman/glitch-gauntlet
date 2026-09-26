import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { useGamepad } from "@/hooks/useGamepad";
import { AudioManager } from "@/lib/audio/AudioManager";
import { rarityFx } from "./upgrade-modal/rarityFx";
import { PixelFx, TIER_HINT } from "./upgrade-modal/pixelFx";
import { drawBack, genCracks, type CrackTier } from "./upgrade-modal/cardBack";
import { PixelUpgradeCard, type CardFate } from "./upgrade-modal/PixelUpgradeCard";
import "./pixelCards.css";
import "./upgrade-modal/upgradePixel.css";

interface UpgradeModalProps {
  onSelectUpgrade: (upgradeId: string) => void;
}

// Cards deal face-down and break open on their own, lowest rarity first so the best card lands last.
// Every card gets the same short crunch; only rare cards earn extra time (a violet catch / gold rumble)
// and screen-wide effects, so the 50th level-up stays quick and a legendary still stops you.
const DEAL_MS = 250;
const DEAL_STAGGER = 60;
const REVEAL_STAGGER = 130;
const CHARGE_MS = 220;
const CRACK_AT = [0.1, 0.35, 0.6, 0.85];
// Per rarity tier (common, uncommon, lunar/void, legendary/boss).
const TIER = {
  beatMs: [0, 0, 150, 350], // extra anticipation after the crunch
  hitstopMs: [0, 30, 70, 150],
  tile: [14, 8, 8, 8], // shatter tile size (logical px on the 56x80 back)
  shatterPower: [0.15, 0.4, 0.8, 1],
  rays: [0, 0, 0.45, 0.8],
};
const TITLE_COLORS = [
  ["#ff6bd6", "#ffd1f3"], ["#ffcf4a", "#fff3b0"], ["#6fd46a", "#b6f28a"], ["#47d6c1", "#bff7f0"],
  ["#4f8fff", "#bcd4ff"], ["#b86bff", "#e3c7ff"], ["#e8434f", "#ff9aa8"], ["#ff9f43", "#ffe0b8"],
];

// Sounds are decoration: a throwing audio call must never abort the reveal mid-frame.
const sfx = (play: (audio: AudioManager) => void) => {
  try { play(AudioManager.getInstance()); } catch (err) { console.warn("upgrade sfx failed", err); }
};

type Phase = "dealing" | "back" | "charging" | "beat" | "hitstop" | "revealed";
interface CardSim {
  phase: Phase;
  dealAt: number;
  revealAt: number;
  charge: number;
  beatMs: number;
  reached: boolean[];
  tease: number;
  hitstopMs: number;
  cracks: CrackTier[];
  suckAcc: number;
  boltAcc: number;
  moteAcc: number;
  rays: number;
  aftershock: number;
}

export default function UpgradeModal({ onSelectUpgrade }: UpgradeModalProps) {
  const { isUpgradeModalOpen, upgradeOptions } = useGameStore(
    useShallow((state) => ({ isUpgradeModalOpen: state.isUpgradeModalOpen, upgradeOptions: state.upgradeOptions })),
  );
  const gameState = useGameStore((state) => state.gameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const promptType = gameState?.upgradePromptType ?? "levelUp";
  const localPlayer = gameState?.players.find((player) => player.id === localPlayerId) ?? null;
  const playerCoins = Math.floor(localPlayer?.coins || 0);
  const isShopPrompt = promptType === "shop" || upgradeOptions.some((option) => option.source === "shop");

  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [hot, setHot] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [barsKey, setBarsKey] = useState(0);
  const [scale, setScale] = useState(5);

  const fx = useMemo(() => new PixelFx(), []);
  const backFxRef = useRef<HTMLCanvasElement>(null);
  const frontFxRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const buttonEls = useRef<(HTMLButtonElement | null)[]>([]);
  const innerEls = useRef<(HTMLDivElement | null)[]>([]);
  const backEls = useRef<(HTMLCanvasElement | null)[]>([]);
  const sims = useRef<CardSim[]>([]);
  const hotRef = useRef<number | null>(null);
  const optionsRef = useRef(upgradeOptions);
  optionsRef.current = upgradeOptions;
  const selectingRef = useRef(false);
  const pendingPick = useRef<number | null>(null);
  const selectRef = useRef<(i: number) => void>(() => {});
  const selectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHotIndex = useCallback((i: number | null) => { hotRef.current = i; setHot(i); }, []);

  // Fresh deal whenever a new set of options arrives; reveal order runs from lowest to highest tier.
  useEffect(() => {
    if (!isUpgradeModalOpen || upgradeOptions.length === 0) return;
    const now = performance.now();
    const order = upgradeOptions.map((o, i) => ({ i, tier: rarityFx(o.rarity).tier })).sort((a, b) => a.tier - b.tier || a.i - b.i);
    const dealDone = now + DEAL_MS + (upgradeOptions.length - 1) * DEAL_STAGGER;
    sims.current = upgradeOptions.map((option, i) => ({
      phase: "dealing", dealAt: now + DEAL_MS + i * DEAL_STAGGER,
      revealAt: dealDone + 80 + order.findIndex((o) => o.i === i) * REVEAL_STAGGER,
      charge: 0, beatMs: TIER.beatMs[rarityFx(option.rarity).tier], reached: [false, false, false, false], tease: 0,
      hitstopMs: 0, cracks: genCracks(Math.floor(Math.random() * 1e9)), suckAcc: 0, boltAcc: 0, moteAcc: 0, rays: 0, aftershock: -1,
    }));
    setRevealed(upgradeOptions.map(() => false));
    setSelectedId(null);
    setHotIndex(null);
    selectingRef.current = false;
    pendingPick.current = null;
    if (selectTimer.current) clearTimeout(selectTimer.current);
  }, [isUpgradeModalOpen, upgradeOptions, setHotIndex]);

  useEffect(() => () => { if (selectTimer.current) clearTimeout(selectTimer.current); }, []);

  const rectOf = useCallback((i: number) => {
    const el = buttonEls.current[i];
    return el ? fx.toLogical(el.getBoundingClientRect()) : { x: fx.W / 2, y: fx.H / 2, w: 1, h: 1 };
  }, [fx]);

  // The break: effects escalate by tier and only rare cards touch the whole screen.
  const release = useCallback((i: number) => {
    const sim = sims.current[i], option = optionsRef.current[i], back = backEls.current[i];
    if (!sim || !option) return;
    const r = rarityFx(option.rarity), tier = r.tier, rect = rectOf(i), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    sim.phase = "revealed";
    setRevealed((prev) => { const next = [...prev]; next[i] = true; return next; });
    if (back) fx.shatter(back, rect, TIER.tile[tier], TIER.shatterPower[tier]);
    fx.sparksAt(cx, cy, [14, 36, 70, 130][tier], [r.color, r.accent], [90, 120, 170, 200][tier], [0.6, 0.8, 1.1, 1.3][tier]);
    if (tier >= 1) fx.ring(cx, cy, r.color, 200, 2);
    if (tier >= 2) {
      fx.ring(cx, cy, "#ffffff", 220, 1, 0.05);
      fx.ring(cx, cy, r.accent, 170, 2, 0.14);
      for (let k = 0; k < 2 + tier * 2; k++) fx.bolt(rect, r.color);
      fx.shake(tier === 3 ? 0.8 : 0.35);
      sfx((a) => a.playUpgradeTease(tier));
    }
    if (tier >= 3) {
      fx.sparksAt(cx, cy, 30, ["#ffffff"], 240, 0.5);
      fx.ring(cx, cy, "#ffcf4a", 130, 3, 0.26);
      fx.ring(cx, cy, "#fff3b0", 90, 1, 0.4);
      fx.confettiAt(cx, cy, 150, ["#ffcf4a", "#fff3b0", "#e0781f", "#ffffff", "#e8434f"]);
      sim.aftershock = 0.32;
      sfx((a) => a.playUpgradeSelect(3));
    }
    if (tier >= 1) sfx((a) => a.playUpgradeReveal(tier));
    if (pendingPick.current === i) { pendingPick.current = null; selectRef.current(i); }
  }, [fx, rectOf]);

  const burst = useCallback((i: number) => {
    const sim = sims.current[i], option = optionsRef.current[i];
    if (!sim || !option || sim.phase === "hitstop" || sim.phase === "revealed") return;
    const tier = rarityFx(option.rarity).tier;
    sim.charge = 1;
    sim.cracks.forEach((t) => { t.shown = true; });
    sim.phase = "hitstop";
    sim.hitstopMs = fx.reduce ? 0 : TIER.hitstopMs[tier];
    // No full-screen flashes (too harsh on a dark screen): rare cards punch locally with a burst + ring.
    if (tier >= 2) { const rect = rectOf(i); fx.sparksAt(rect.x + rect.w / 2, rect.y + rect.h / 2, 20, ["#ffffff", TIER_HINT[tier]], 110, 0.3); fx.ring(rect.x + rect.w / 2, rect.y + rect.h / 2, "#ffffff", 120, 2); }
    if (tier >= 3 && !fx.reduce) setBarsKey((k) => k + 1);
  }, [fx, rectOf]);

  // Break a face-down card right now (click, or a hotkey pick before it opened on its own).
  const crackNow = useCallback((i: number) => {
    const sim = sims.current[i], option = optionsRef.current[i];
    if (!sim || !option || sim.phase === "hitstop" || sim.phase === "revealed") return;
    sim.tease = rarityFx(option.rarity).tier;
    burst(i);
  }, [burst]);

  const select = useCallback((i: number) => {
    const option = optionsRef.current[i], sim = sims.current[i];
    if (!option || !sim || selectingRef.current) return;
    if (sim.phase !== "revealed") { crackNow(i); return; }
    const unaffordable = isShopPrompt && !option.isSkipOption && (option.cost || 0) > playerCoins;
    if (unaffordable) { fx.shake(0.25); return; }
    selectingRef.current = true;
    setSelectedId(option.id);
    const r = rarityFx(option.rarity), rect = rectOf(i), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    fx.sparksAt(cx, cy, 60 + r.tier * 40, [r.color, r.accent, "#ffffff"], 180 + r.tier * 30, 1.1);
    fx.confettiAt(cx, cy, 40 + r.tier * 30, [r.color, r.accent, "#ffffff", "#ffcf4a"]);
    for (let k = 0; k < 2 + Math.min(1, r.tier); k++) fx.ring(cx, cy, k % 2 ? r.accent : r.color, 280 - k * 60, 3, k * 0.08);
    fx.shake(0.3 + r.tier * 0.1);
    sfx((a) => a.playUpgradeSelect(r.tier));
    selectTimer.current = setTimeout(() => onSelectUpgrade(option.id), 480);
  }, [crackNow, fx, isShopPrompt, onSelectUpgrade, playerCoins, rectOf]);
  selectRef.current = select;

  // Hotkey / gamepad pick: works whether or not the card has opened yet.
  const pick = useCallback((i: number) => {
    const sim = sims.current[i];
    if (!sim || selectingRef.current) return;
    if (sim.phase === "revealed") select(i);
    else { pendingPick.current = i; crackNow(i); }
  }, [crackNow, select]);

  // Canvas setup + card scale follow the window.
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const fit = () => {
      if (backFxRef.current && frontFxRef.current) fx.attach(backFxRef.current, frontFxRef.current);
      setScale(window.innerWidth >= 1100 && window.innerHeight >= 780 ? 5 : window.innerWidth >= 760 ? 4 : 3);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [isUpgradeModalOpen, fx]);

  // Frame loop: deal -> crunch -> (rare beat) -> hit-stop -> break, then FX simulate + draw.
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    let raf = 0, last = performance.now(), t = 0, reported = false;
    const loop = (now: number) => {
      // Schedule first and catch below, so one bad frame can never freeze the whole reveal.
      raf = requestAnimationFrame(loop);
      try { frame(now); } catch (err) { if (!reported) { reported = true; console.error("upgrade reveal frame failed", err); } }
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; t += dt;
      const halos: typeof fx.halos = [], rays: typeof fx.rays = [];
      let frozen = false;
      optionsRef.current.forEach((option, i) => {
        const sim = sims.current[i], inner = innerEls.current[i], back = backEls.current[i];
        if (!sim) return;
        const r = rarityFx(option.rarity), tier = r.tier, rect = rectOf(i), cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
        const g = back?.getContext("2d");
        if (sim.phase === "dealing" && now >= sim.dealAt) {
          sim.phase = "back";
          fx.sparksAt(cx, rect.y + rect.h, 8, ["#a9a3c9", "#6a6394"], 40, 0.4);
        }
        if (sim.phase === "back" && now >= sim.revealAt && !selectingRef.current) sim.phase = "charging";
        if (sim.phase === "charging") {
          // The crunch: identical for every card so it never gives the rarity away.
          sim.charge = Math.min(1, sim.charge + dt * 1000 / CHARGE_MS);
          const c = sim.charge;
          CRACK_AT.forEach((at, k) => {
            if (!sim.reached[k] && c >= at) {
              sim.reached[k] = true; sim.cracks[k].shown = true;
              if (k === 0) sfx((a) => a.playUpgradeCrack(0));
              fx.sparksAt(cx, cy, 5, [TIER_HINT[sim.tease]], 70, 0.3);
            }
          });
          if (tier >= 1 && c >= 0.5 && sim.tease < 1) sim.tease = 1;
          halos.push({ rect, color: TIER_HINT[sim.tease], strength: c * 0.7 });
          if (inner) inner.style.transform = fx.reduce ? "" : `translate(${Math.round((Math.random() - 0.5) * c * 2) * 2}px, 0)`;
          if (c >= 1) {
            if (sim.beatMs > 0) {
              sim.phase = "beat";
              sim.tease = 2;
              sfx((a) => a.playUpgradeTease(2));
              fx.ring(cx, cy, TIER_HINT[2], 150, 2);
              fx.sparksAt(cx, cy, 18, [TIER_HINT[2], "#ffffff"], 110, 0.45);
            } else burst(i);
          }
        } else if (sim.phase === "beat") {
          // Rare-only anticipation: violet catch, and for legendary a gold rumble with lightning.
          sim.beatMs -= dt * 1000;
          const beatTotal = TIER.beatMs[tier];
          if (tier >= 3 && sim.tease < 3 && sim.beatMs < beatTotal * 0.55) {
            sim.tease = 3;
            sfx((a) => a.playUpgradeTease(3));
            fx.ring(cx, cy, TIER_HINT[3], 170, 2);
            fx.sparksAt(cx, cy, 30, [TIER_HINT[3], "#ffffff"], 130, 0.5);
            fx.shake(0.3);
          }
          const hint = TIER_HINT[sim.tease], k = 1 - Math.max(0, sim.beatMs) / beatTotal;
          sim.suckAcc += dt * (40 + 160 * k) * (fx.reduce ? 0.3 : 1);
          while (sim.suckAcc > 1) { sim.suckAcc--; fx.suck(rect, hint); }
          if (tier >= 3) { sim.boltAcc += dt * 14 * (fx.reduce ? 0.3 : 1); while (sim.boltAcc > 1) { sim.boltAcc--; fx.bolt(rect, Math.random() < 0.3 ? "#ffffff" : hint); } }
          halos.push({ rect, color: hint, strength: 0.7 + 0.3 * k });
          if (inner) { const jit = fx.reduce ? 0 : 1 + k * 3; inner.style.transform = `translate(${Math.round((Math.random() - 0.5) * jit) * 2}px, ${Math.round((Math.random() - 0.5) * jit) * 2}px) scale(${1 + Math.round(k * 3) * 0.02})`; }
          fx.warp = Math.max(fx.warp, tier >= 3 ? 1 + 4 * k : 0.5 + k);
          if (sim.beatMs <= 0) burst(i);
        } else if (sim.phase === "hitstop") {
          frozen = true;
          halos.push({ rect, color: TIER_HINT[sim.tease], strength: 1 });
          if (inner) inner.style.transform = tier >= 2 ? "scale(1.06)" : "";
          sim.hitstopMs -= dt * 1000;
          if (sim.hitstopMs <= 0) { if (inner) inner.style.transform = ""; release(i); }
        } else if (sim.phase === "revealed") {
          sim.rays += (TIER.rays[tier] * (hotRef.current === i ? 1.25 : 1) - sim.rays) * Math.min(1, dt * 3);
          if (sim.rays > 0.02) rays.push({ x: cx, y: cy, color: r.color, strength: sim.rays, tier });
          if (tier >= 2) { sim.moteAcc += dt * (tier * 2 + (hotRef.current === i ? 3 : 0)) * (fx.reduce ? 0.4 : 1); while (sim.moteAcc > 1) { sim.moteAcc--; fx.mote(rect, r.color); } }
          if (sim.aftershock > 0 && (sim.aftershock -= dt) <= 0) {
            fx.ring(cx, cy, r.color, 220, 2);
            fx.sparksAt(cx, cy, 50, [r.color, r.accent], 140, 0.7);
            fx.confettiAt(cx, cy, 60, ["#ffcf4a", "#fff3b0", "#ffffff"]);
            fx.shake(0.4);
          }
          if (tier >= 3 && Math.random() < dt * 1.2 * (fx.reduce ? 0.3 : 1)) fx.bolt(rect, r.color);
        }
        if (g && sim.phase !== "revealed") {
          sim.cracks.forEach((tierCracks) => { if (tierCracks.shown) tierCracks.prog = Math.min(1, tierCracks.prog + dt * 12); });
          drawBack(g, t, sim.charge, TIER_HINT[sim.tease], sim.cracks);
        }
      });
      fx.halos = halos; fx.rays = rays;
      fx.warp += (0.2 - fx.warp) * Math.min(1, dt * 1.6);
      if (!frozen) fx.step(dt);
      fx.render();
      if (shakeRef.current) { const o = fx.shakeOffset(); shakeRef.current.style.transform = o.x || o.y ? `translate(${o.x * 2}px, ${o.y * 2}px)` : ""; }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isUpgradeModalOpen, fx, rectOf, burst, release]);

  // Keyboard: 1/2/3 pick instantly; arrows move focus, Enter/Space picks the focused card.
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = optionsRef.current.length;
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit) { const i = Number(digit[2]) - 1; if (i < n) { e.preventDefault(); pick(i); } return; }
      if (e.code === "ArrowLeft" || e.code === "ArrowUp") { e.preventDefault(); setHotIndex(Math.max(0, (hotRef.current ?? 1) - 1)); }
      else if (e.code === "ArrowRight" || e.code === "ArrowDown") { e.preventDefault(); setHotIndex(Math.min(n - 1, (hotRef.current ?? -1) + 1)); }
      else if ((e.code === "Enter" || e.code === "Space") && hotRef.current !== null) { e.preventDefault(); pick(hotRef.current); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isUpgradeModalOpen, pick, setHotIndex]);

  // Gamepad: stick/d-pad moves focus, A / L1 picks.
  const { getGamepadInput } = useGamepad();
  const lastPad = useRef({ left: false, right: false, confirm: false });
  useEffect(() => {
    if (!isUpgradeModalOpen) return;
    const poll = setInterval(() => {
      const input = getGamepadInput();
      if (!input) return;
      const n = optionsRef.current.length, cur = hotRef.current;
      const left = !!(input.left || input.up), right = !!(input.right || input.down), confirm = !!input.blink;
      if (left && !lastPad.current.left) setHotIndex(Math.max(0, (cur ?? 1) - 1));
      if (right && !lastPad.current.right) setHotIndex(Math.min(n - 1, (cur ?? -1) + 1));
      if (confirm && !lastPad.current.confirm) { if (cur === null) setHotIndex(0); else pick(cur); }
      lastPad.current = { left, right, confirm };
    }, 80);
    return () => clearInterval(poll);
  }, [isUpgradeModalOpen, getGamepadInput, pick, setHotIndex]);

  if (!isUpgradeModalOpen || upgradeOptions.length === 0) return null;

  const title = isShopPrompt ? "SHOP ROUND" : "LEVEL UP!";
  const legendaryOut = upgradeOptions.some((o, i) => revealed[i] && rarityFx(o.rarity).tier >= 3);
  return (
    <div className="pxu-root fixed inset-0 z-50 overflow-hidden" data-testid="upgrade-modal">
      <canvas ref={backFxRef} className="pxu-fx" aria-hidden />
      <div ref={shakeRef} className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-4">
        <div className="text-center">
          <h2 className={`pxu-title ${legendaryOut ? "pxu-title-rainbow" : ""}`} aria-label={title}>
            {title.split("").map((ch, i) => {
              const [c, a] = TITLE_COLORS[i % TITLE_COLORS.length];
              return <span key={`${title}-${i}`} style={{ "--i": i, "--c": c, "--a": a, "--d": "#2b2461" } as CSSProperties}>{ch === " " ? " " : ch}</span>;
            })}
          </h2>
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="pxu-sub">{isShopPrompt ? `Spend coins on one upgrade or leave · $${playerCoins}` : "XP bar filled. Pick an upgrade."}</span>
            {!isShopPrompt && localPlayer && <span className="pxu-lv">LV {localPlayer.level}</span>}
          </div>
        </div>
        <div className="mt-10 flex items-end justify-center gap-6 md:gap-10">
          {upgradeOptions.map((option, index) => {
            const fate: CardFate = selectedId === null ? "none" : selectedId === option.id ? "lock" : "drop";
            return (
              <PixelUpgradeCard
                key={`${option.id}-${index}`}
                option={option}
                index={index}
                scale={scale}
                revealed={!!revealed[index]}
                hot={hot === index}
                fate={fate}
                isShopPrompt={isShopPrompt}
                playerCoins={playerCoins}
                dealDelayMs={index * DEAL_STAGGER}
                onActivate={() => pick(index)}
                onHover={(h) => { if (h) setHotIndex(index); else if (hotRef.current === index) setHotIndex(null); }}
                buttonRef={(el) => { buttonEls.current[index] = el; }}
                innerRef={(el) => { innerEls.current[index] = el; }}
                backRef={(el) => { backEls.current[index] = el; }}
              />
            );
          })}
        </div>
        <div className="pxu-hint mt-4">{selectedId ? " " : <>CLICK A CARD OR PRESS <b>1 / 2 / 3</b> TO PICK</>}</div>
      </div>
      <canvas ref={frontFxRef} className="pxu-fx z-20" aria-hidden />
      {barsKey > 0 && <div key={`bars-${barsKey}`} className="pxu-bars absolute inset-0 pointer-events-none" />}
      <div className="pxu-scan" />
    </div>
  );
}
