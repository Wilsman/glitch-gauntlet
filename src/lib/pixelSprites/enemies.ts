import type { EnemyType } from "@shared/types";
import { FX_PREFIX, drawLegs, setPixel, type Grid } from "./engine";
import {
  ellipse,
  line,
  mirror,
  mirrorGrid,
  rect,
  rows,
  type CreatureArt,
  type CreatureContext,
} from "./draw";

/**
 * Enemy pixel art. Directional enemies are authored facing RIGHT and are
 * mirrored by the renderer based on movement; the rest are symmetric.
 */

const fx = (key: string) => `${FX_PREFIX}${key}`;
const bobOf = (ctx: CreatureContext) => (ctx.frame >= 2 ? 1 : 0);

// ---------------------------------------------------------------------------
// Grunt — "Bit Goblin": boxy yellow imp-bot with a red cyclops visor.
// ---------------------------------------------------------------------------
const grunt: CreatureArt = {
  id: "grunt",
  width: 15,
  height: 16,
  directional: true,
  frameMs: 120,
  signature: "#ffe23d",
  palette: {
    Y: "#ffe23d", y: "#c9a400", o: "#6e5500",
    K: "#1d1a10", E: "#ff3b3b", W: "#ffffff",
    M: "#7d7f8a", m: "#4a4c55",
  },
  draw: (g, ctx) => {
    drawLegs(g, {
      hipY: 11, length: 4, backX: 4, frontX: 8, width: 2,
      pants: "M", pantsShade: "m", boot: "o",
    }, ctx);
    const b = ctx.moving ? ctx.frame % 2 : bobOf(ctx);
    rows(g, [
      ".y.......y...",
      ".Yy.....yY...",
      "..YYYYYYYY...",
      ".YYYYYYYYYY..",
      ".YYKKKKKKKY..",
      ".YYKKKKKEEY..",
      ".YYKKKKKEWY..",
      ".yYYYYYYYYY..",
      ".yYoYoYoYYyMM",
      "..yyyyyyyy.m.",
    ], 1, 1 + b);
    if (ctx.enraged) {
      setPixel(g, 9, 6 + b, fx("W"));
      setPixel(g, 10, 6 + b, fx("E"));
    }
  },
};

// ---------------------------------------------------------------------------
// Slugger — "Mortar Slug": armoured slug lobbing shells from its back.
// ---------------------------------------------------------------------------
const slugger: CreatureArt = {
  id: "slugger",
  width: 21,
  height: 15,
  directional: true,
  frameMs: 170,
  signature: "#ff8a1f",
  palette: {
    O: "#ff8a1f", o: "#b85a0c", d: "#6e320a",
    S: "#8b93a3", s: "#555c6b", L: "#c3cad6", n: "#2b2f38",
    E: "#fff3a8", K: "#1a1208", G: "#b6ff5c", T: "#ffec5c",
  },
  draw: (g, ctx) => {
    const wob = ctx.frame % 2;
    rows(g, [
      "..............K.K...",
      "..............E.E...",
      "....nn........o.o...",
      "....sn........o.o...",
      "...sSLs.......oOo...",
      "..sSLSSss....oOOOo..",
      ".sSSSSSSSs..oOOOOOo.",
      ".sSsSSSsSSsoOOOOOOOo",
      "oOOOOOOOOOOOOOOOOOdo",
      "oOoOOOoOOOoOOOOOOOOo",
      ".oOOOOOOOOOOOOOOOOo.",
      "..dddddddddddddddd..",
    ], 0, 2);
    // Eye stalks sway.
    if (wob) {
      setPixel(g, 14, 2, null);
      setPixel(g, 15, 2, "K");
      setPixel(g, 15, 3, "E");
      setPixel(g, 14, 3, null);
    }
    // Belly ripple while crawling.
    if (ctx.moving) {
      for (let x = 3 + wob * 2; x < 18; x += 4) setPixel(g, x, 13, null);
      setPixel(g, 0, 13, fx("G"));
      setPixel(g, 1 + wob, 14, fx("G"));
    }
    // Mortar heats up before firing, then puffs smoke.
    if (ctx.state === "telegraph") {
      setPixel(g, 4, 4, fx("T"));
      setPixel(g, 5, 4, fx("T"));
      if (ctx.charge >= 2) {
        setPixel(g, 4, 3, fx("W"));
        setPixel(g, 5, 3, fx("W"));
      }
    } else if (ctx.state === "attack") {
      setPixel(g, 4, 3, fx("Y"));
      setPixel(g, 5, 2, fx("W"));
      setPixel(g, 3, 1, fx("W"));
      setPixel(g, 6, 0, fx("W"));
    }
  },
};

// ---------------------------------------------------------------------------
// Hellhound — armoured cyber-hound with a burning mane, 4-frame gallop.
// ---------------------------------------------------------------------------
const HOUND_GALLOP: [number, number][] = [
  [-2, 2],
  [0, 0],
  [2, -2],
  [0, 0],
];

const hellhound: CreatureArt = {
  id: "hellhound",
  width: 22,
  height: 17,
  directional: true,
  frameMs: 80,
  signature: "#ff3b1f",
  palette: {
    R: "#b3121f", r: "#6e0a13", d: "#3a060b",
    K: "#1a0b0e", k: "#3b2328",
    F: "#ff6a1a", f: "#ffd23d",
    E: "#fff05a", W: "#ffffff",
  },
  draw: (g, ctx) => {
    const [backSwing, frontSwing] = ctx.moving ? HOUND_GALLOP[ctx.frame] : [0, 0];
    const lift = ctx.moving && (ctx.frame === 1 || ctx.frame === 3) ? -1 : 0;
    // Legs first so the body overlaps the hips.
    const leg = (hipX: number, swing: number, shade: boolean) => {
      line(g, hipX, 11 + lift, hipX + swing, 15 + lift, shade ? "r" : "R");
      setPixel(g, hipX + swing + 1, 15 + lift, "K");
    };
    leg(3, backSwing, true);
    leg(5, backSwing - 1, false);
    leg(14, frontSwing, true);
    leg(16, frontSwing + 1, false);

    rows(g, [
      "............f.f.......",
      "..........fFfFf.......",
      ".........FFkKKk.......",
      "........FFKRRRRRk.....",
      ".f......FKRRRRERRRR...",
      "fF.....FKRRRRRRRRRRRr.",
      ".FF...FkRRRRRRRdWdWdd.",
      "..FKKKKKRRRRRRRRRdd...",
      "..KRRkRRRkRRRRRRr.....",
      "..rRRRRRRRRRRRRRr.....",
      "..rrRRRRRRRRRRRrr.....",
    ], 0, 0 + lift);
    // Flame flicker along the mane and tail.
    const flick = ctx.frame % 2 === 0;
    setPixel(g, flick ? 11 : 13, 0 + lift, fx(flick ? "f" : "F"));
    setPixel(g, 0, (flick ? 3 : 4) + lift, fx("F"));
    if (ctx.enraged) {
      setPixel(g, 14, 4 + lift, fx("W"));
      setPixel(g, 10, 0 + lift, fx("f"));
    }
    // Jaw snaps open mid-stride.
    if (ctx.frame === 2) setPixel(g, 19, 7 + lift, "d");
  },
};

// ---------------------------------------------------------------------------
// Splitter — "Mitosis Blob": jelly cube with two eyeball nuclei mid-division.
// ---------------------------------------------------------------------------
const SPLIT_SQUASH = [0, 1, 0, -1];

const splitter: CreatureArt = {
  id: "splitter",
  width: 20,
  height: 16,
  frameMs: 150,
  signature: "#b84dff",
  palette: {
    P: "#9d00ff", p: "#5e00a0", L: "#d38bff",
    N: "#ffe8ff", n: "#ff9cf0", K: "#1a0030", d: "#3a0066",
  },
  draw: (g, ctx) => {
    const s = SPLIT_SQUASH[ctx.frame];
    ellipse(g, 9.5, 9, 8.2 + s * 0.6, 6 - s * 0.6, "P", "p", "L");
    // Pinch line where it's dividing.
    for (let y = 4; y <= 14; y += 2) {
      setPixel(g, 9, y, "d");
      setPixel(g, 10, y + 1, "d");
    }
    // Two nuclei with eyes that look toward the pinch.
    for (const cx of [5.5, 13.5]) {
      ellipse(g, cx, 8.5, 1.8, 1.8, "N", "n");
      setPixel(g, Math.round(cx) + (cx < 9 ? 0 : -1), 8, "K");
    }
    // Drip.
    setPixel(g, 4 + ctx.frame * 3, 15 - (s > 0 ? 0 : 1), "p");
  },
};

const miniSplitter: CreatureArt = {
  id: "mini-splitter",
  width: 12,
  height: 11,
  frameMs: 110,
  signature: "#d38bff",
  palette: {
    P: "#c77dff", p: "#7a2fbf", L: "#f0d4ff",
    N: "#ffe8ff", K: "#1a0030",
  },
  draw: (g, ctx) => {
    const hop = ctx.moving && (ctx.frame === 1 || ctx.frame === 2) ? 1 : 0;
    const squash = ctx.frame === 0 ? 0.6 : 0;
    ellipse(g, 5.5, 6.5 - hop, 4.6 + squash, 3.6 - squash, "P", "p", "L");
    ellipse(g, 6, 6 - hop, 1.3, 1.3, "N");
    setPixel(g, 6, 6 - hop, "K");
  },
};

// ---------------------------------------------------------------------------
// Neon Pulse — electric jellyfish that swells before discharging.
// ---------------------------------------------------------------------------
const neonPulse: CreatureArt = {
  id: "neon-pulse",
  width: 18,
  height: 21,
  frameMs: 160,
  signature: "#00e5ff",
  palette: {
    B: "#00d0f0", b: "#006f8a", L: "#b8fbff",
    C: "#eaffff", T: "#5ff0ff", t: "#1a8fae", W: "#ffffff",
  },
  draw: (g, ctx) => {
    const swell = ctx.state === "telegraph" ? Math.min(2, ctx.charge * 0.7) : 0;
    const bob = ctx.frame === 1 || ctx.frame === 2 ? 1 : 0;
    const top = 1 + bob;
    // Bell (top half of an ellipse).
    const rx = 7 + swell;
    const ry = 6 + swell * 0.5;
    const cy = top + ry;
    ellipse(g, 8.5, cy, rx, ry, "B", "b", "L");
    for (let y = Math.ceil(cy) + 1; y < g.length; y++) {
      for (let x = 0; x < g[0].length; x++) g[y][x] = null;
    }
    // Scalloped rim.
    const rimY = Math.ceil(cy);
    for (let x = Math.ceil(8.5 - rx); x <= Math.floor(8.5 + rx); x++) {
      setPixel(g, x, rimY, (x + ctx.frame) % 2 === 0 ? "b" : "T");
    }
    // Core.
    const coreKey = ctx.state === "telegraph" && ctx.charge >= 2 ? fx("W") : "C";
    ellipse(g, 8.5, cy - 1.5, 1.8 + swell * 0.4, 1.6 + swell * 0.3, coreKey);
    // Tentacles wave; they curl up while charging.
    const length = ctx.state === "telegraph" ? 5 : 8;
    [3, 6, 11, 14].forEach((x, i) => {
      for (let j = 1; j <= length; j++) {
        const wave = Math.round(Math.sin((j + ctx.frame * 1.6 + i) * 0.9));
        setPixel(g, x + wave, rimY + j, j % 3 === 0 ? "t" : "T");
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Glitch Spider — top-down skitterer with a corrupted data stripe.
// ---------------------------------------------------------------------------
const glitchSpider: CreatureArt = {
  id: "glitch-spider",
  width: 16,
  height: 15,
  frameMs: 70,
  signature: "#ff2bb4",
  palette: {
    P: "#ff00aa", p: "#99005f", L: "#ff7ad1",
    K: "#1a0514", k: "#c0307f", E: "#ff2a2a", G: "#3dfcff",
  },
  draw: (g, ctx) => {
    // Legs on the left half, mirrored.
    for (let i = 0; i < 4; i++) {
      const hipY = 5 + i * 2;
      const w = (i + ctx.frame) % 2 === 0 ? -1 : 1;
      const kneeX = 2;
      const kneeY = hipY - 2 + w;
      line(g, 5, hipY, kneeX, kneeY, "k");
      line(g, kneeX, kneeY, 0, kneeY + 3, "k");
    }
    mirrorGrid(g);
    ellipse(g, 7.5, 9.5, 4, 3.8, "P", "p", "L");
    ellipse(g, 7.5, 4.5, 2.6, 2.1, "K");
    [
      [6, 3],
      [9, 3],
      [7, 4],
      [8, 4],
    ].forEach(([x, y]) => setPixel(g, x, y, "E"));
    // Glitch stripe tears sideways every other frame.
    const shift = ctx.frame === 1 ? 1 : ctx.frame === 3 ? -1 : 0;
    for (let x = 5; x <= 10; x++) setPixel(g, x + shift, 10, fx("G"));
    if (shift !== 0) setPixel(g, shift > 0 ? 13 : 2, 10, fx("G"));
  },
};

// ---------------------------------------------------------------------------
// Tank Bot — tracked battering ram with a red visor and hazard plow.
// ---------------------------------------------------------------------------
const tankBot: CreatureArt = {
  id: "tank-bot",
  width: 26,
  height: 22,
  directional: true,
  frameMs: 90,
  signature: "#ff4040",
  palette: {
    S: "#8b93a3", s: "#555c6b", L: "#c3cad6",
    n: "#23262e", m: "#41464f", M: "#9aa0ab",
    K: "#121418", E: "#ff3030", Y: "#ffd23f", W: "#ffffff", F: "#ff8a1f",
  },
  draw: (g, ctx) => {
    const lean = ctx.state === "attack" ? 1 : 0;
    // Treads.
    rect(g, 1, 16, 22, 5, "n");
    [3, 7, 11, 15, 19].forEach((x) => {
      rect(g, x, 17, 3, 3, "m");
      setPixel(g, x + 1, 18, "M");
    });
    const treadStep = ctx.moving || ctx.state === "attack" ? ctx.frame : 0;
    for (let x = 1; x <= 22; x++) {
      if ((x + treadStep) % 3 === 0) setPixel(g, x, 16, "M");
      if ((x - treadStep + 30) % 3 === 0) setPixel(g, x, 20, "M");
    }
    [[1, 16], [22, 16], [1, 20], [22, 20]].forEach(([x, y]) => setPixel(g, x, y, null));
    // Hull.
    rect(g, 3, 10, 19, 6, "S");
    rect(g, 3, 15, 19, 1, "s");
    rect(g, 4, 10, 17, 1, "L");
    [6, 10, 14, 18].forEach((x) => setPixel(g, x, 12, "n"));
    // Hazard plow.
    for (let y = 10; y <= 15; y++) {
      setPixel(g, 22, y, (y + (ctx.state === "attack" ? ctx.frame : 0)) % 2 ? "Y" : "K");
      setPixel(g, 23, y, (y + 1) % 2 ? "Y" : "K");
    }
    // Exhaust stack.
    rect(g, 4, 3, 2, 7, "m");
    rect(g, 3, 2, 4, 1, "n");
    // Turret head.
    rect(g, 8 + lean, 3, 10, 7, "S");
    rect(g, 8 + lean, 9, 10, 1, "s");
    rect(g, 9 + lean, 3, 7, 1, "L");
    setPixel(g, 8 + lean, 3, null);
    setPixel(g, 17 + lean, 3, null);
    rect(g, 12 + lean, 5, 6, 2, "K");
    const eyeHot = ctx.state !== "idle" && ctx.frame % 2 === 0;
    rect(g, 15 + lean, 5, 2, 2, eyeHot ? fx("W") : "E");
    // Exhaust: steam while winding up, flames while ramming.
    if (ctx.state === "telegraph") {
      setPixel(g, 4, 1, fx("W"));
      setPixel(g, 5 + (ctx.frame % 2), 0, fx("W"));
    } else if (ctx.state === "attack") {
      setPixel(g, 4, 1, fx("F"));
      setPixel(g, 5, 1, fx("Y"));
      setPixel(g, 4 + (ctx.frame % 2), 0, fx("F"));
    }
  },
};

// ---------------------------------------------------------------------------
// Leech Beacon — hovering relay that links and buffs nearby enemies.
// ---------------------------------------------------------------------------
const leechBeacon: CreatureArt = {
  id: "leech-beacon",
  width: 16,
  height: 18,
  frameMs: 180,
  signature: "#7cff8a",
  palette: {
    G: "#7cff8a", g: "#2fbf4f", L: "#eaffee",
    M: "#b9c2cc", m: "#6b7480", n: "#26302a",
    k: "#1f4a2a", K: "#3d8a4f", A: "#b9ff88",
  },
  draw: (g, ctx) => {
    const bob = ctx.frame === 1 || ctx.frame === 2 ? 1 : 0;
    const narrowDish = ctx.frame % 2 === 1;
    rows(g, mirror([
      ".......A",
      ".......m",
      narrowDish ? "...mMMMM" : "..mMMMMM",
      narrowDish ? "....mMMM" : "...mMMMM",
      ".....nnn",
      "....nGGG",
      "...nGgLG",
      "...nGGGG",
      "....nGgG",
      ".....nnn",
      "...kKKKK",
      "..kK.kKK",
      ".kK..kK.",
      ".K...kK.",
      "K.....K.",
    ]), 0, 1 + bob);
    if (ctx.state !== "idle") {
      // Casting: core flares and the tendrils light up.
      setPixel(g, 7, 7 + bob, fx("L"));
      setPixel(g, 8, 7 + bob, fx("L"));
      setPixel(g, 7, 0 + bob, fx("A"));
      setPixel(g, 8, 0 + bob, fx("A"));
      [[1, 13], [14, 13], [0, 15], [15, 15]].forEach(([x, y]) =>
        setPixel(g, x, y + bob, fx("A")),
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Bomber — waddling bomb with a lit fuse that flashes before it pops.
// ---------------------------------------------------------------------------
const bomber: CreatureArt = {
  id: "bomber",
  width: 16,
  height: 18,
  directional: true,
  frameMs: 120,
  signature: "#ff6a33",
  palette: {
    B: "#2a2f4a", b: "#171a2c", L: "#5a6490",
    O: "#ff6a33", R: "#ff2b2b", E: "#ffe45c", K: "#0a0a12",
    M: "#9aa0ab", f: "#d8c08a", W: "#ffffff", Y: "#fff36b",
  },
  draw: (g, ctx) => {
    const step = ctx.moving ? ctx.frame % 2 : 0;
    // Feet.
    rect(g, 4, 16 - step, 3, 1, "K");
    rect(g, 9, 15 + step, 3, 1, "K");
    const flashing = ctx.state === "telegraph" && ctx.frame % 2 === 0;
    ellipse(g, 7.5, 10, 6, 5.6, flashing ? "R" : "B", "b", flashing ? "R" : "L");
    // Stripe band.
    for (let x = 0; x < 16; x++) {
      const k = g[10][x];
      if (k && k !== "O") setPixel(g, x, 10, "O");
    }
    // Angry eyes (facing right).
    setPixel(g, 9, 8, "E");
    setPixel(g, 12, 8, "E");
    setPixel(g, 8, 7, "K");
    setPixel(g, 9, 7, "K");
    setPixel(g, 12, 7, "K");
    setPixel(g, 13, 7, "K");
    // Cap + fuse + spark.
    rect(g, 6, 3, 4, 2, "M");
    line(g, 8, 2, 10, 0, "f");
    const sparkKey = ["Y", "W", "O", "W"][ctx.frame];
    setPixel(g, 11, 0, fx(sparkKey));
    if (ctx.state === "telegraph") {
      setPixel(g, 12, 1, fx("Y"));
      setPixel(g, 11, 1, fx("W"));
    }
  },
};

// ---------------------------------------------------------------------------
// Orbit Drone — quad-rotor sentry with a pink camera lens.
// ---------------------------------------------------------------------------
const orbitDrone: CreatureArt = {
  id: "orbit-drone",
  width: 18,
  height: 14,
  frameMs: 60,
  signature: "#7ae3ff",
  palette: {
    S: "#7ae3ff", s: "#2a8fb0", L: "#dffaff",
    m: "#41566b", K: "#0e1a26", E: "#ff3dd4", W: "#ffffff",
  },
  draw: (g, ctx) => {
    const bob = ctx.frame >= 2 ? 1 : 0;
    // Arms + rotor hubs (left half then mirror).
    line(g, 5, 6 + bob, 2, 3 + bob, "m");
    line(g, 5, 8 + bob, 2, 11 + bob, "m");
    setPixel(g, 2, 3 + bob, "K");
    setPixel(g, 2, 11 + bob, "K");
    const spin = ctx.frame % 2 === 0;
    for (const y of [2 + bob, 10 + bob]) {
      if (spin) {
        for (let x = 0; x <= 4; x++) setPixel(g, x, y, fx("W"));
      } else {
        setPixel(g, 1, y - 1, fx("W"));
        setPixel(g, 3, y + 1, fx("W"));
        setPixel(g, 2, y, fx("W"));
      }
    }
    mirrorGrid(g);
    // Pod + lens.
    ellipse(g, 8.5, 7 + bob, 4.2, 3.2, "S", "s", "L");
    ellipse(g, 8.5, 7.5 + bob, 1.6, 1.4, "K");
    setPixel(g, 8, 7 + bob, "E");
    setPixel(g, 9, 7 + bob, "E");
    if (ctx.frame === 0) setPixel(g, 8, 6 + bob, fx("W"));
  },
};

export const ENEMY_ART: Record<EnemyType, CreatureArt> = {
  grunt,
  slugger,
  hellhound,
  splitter,
  "mini-splitter": miniSplitter,
  "neon-pulse": neonPulse,
  "glitch-spider": glitchSpider,
  "tank-bot": tankBot,
  "leech-beacon": leechBeacon,
  bomber,
  "orbit-drone": orbitDrone,
};

export function drawCreature(art: CreatureArt, ctx: CreatureContext): Grid {
  const g: Grid = Array.from({ length: art.height }, () =>
    Array<string | null>(art.width).fill(null),
  );
  art.draw(g, ctx);
  return g;
}
