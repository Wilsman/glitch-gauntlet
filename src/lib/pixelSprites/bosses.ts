import type { BossType } from "@shared/types";
import { FX_PREFIX, setPixel, type Grid } from "./engine";
import {
  ellipse,
  line,
  mirror,
  rect,
  rows,
  type CreatureArt,
  type CreatureContext,
} from "./draw";

/**
 * Boss pixel art. Bosses face the camera, so most are authored as left
 * halves and mirrored. Arms are separate parts so wind-ups can raise them.
 */

const fx = (key: string) => `${FX_PREFIX}${key}`;

/** Stamp left-half rows at (x, y) and their mirror image on the right. */
function mirrored(g: Grid, half: string[], x: number, y: number) {
  const w = g[0].length;
  for (let r = 0; r < half.length; r++) {
    for (let c = 0; c < half[r].length; c++) {
      const key = half[r][c];
      if (key === "." || key === " ") continue;
      setPixel(g, x + c, y + r, key);
      setPixel(g, w - 1 - (x + c), y + r, key);
    }
  }
}

const breathe = (ctx: CreatureContext) => (ctx.frame === 1 || ctx.frame === 2 ? 1 : 0);
const armLift = (ctx: CreatureContext, raise: number) =>
  ctx.state === "telegraph" ? -raise : ctx.state === "attack" ? 1 : 0;

// ---------------------------------------------------------------------------
// Berserker — horned cyber-oni brute with a furnace chest.
// ---------------------------------------------------------------------------
const berserker: CreatureArt = {
  id: "boss-berserker",
  width: 32,
  height: 32,
  frameMs: 160,
  signature: "#ff2a2a",
  palette: {
    R: "#e0262f", r: "#9a1119", d: "#4a070c",
    H: "#f2e6c9", h: "#b8a57e",
    K: "#17090b", k: "#3a2226",
    E: "#ffe45c", T: "#ffffff",
    M: "#9aa0ad", G: "#ff7a1a", C: "#ffe0a0",
  },
  enragedPalette: { R: "#8b0010", r: "#55000a", E: "#ffffff", G: "#ff2020", C: "#ffffff" },
  draw: (g, ctx) => {
    const b = breathe(ctx);
    mirrored(g, [
      "................",
      ".H..............",
      ".Hh.............",
      "..Hh......dddddd",
      "..HHh...dRRRRRRR",
      "...HHh.dRRRRRRRR",
      "....HHdRRRRRRRRR",
      "......dRKKKKRRRR",
      "......dRREEKRRRR",
      "......dRRRRRRRRR",
      "......dRRdTdTdTd",
      ".......drRRRRRRR",
      "......KKKdrrrrrr",
      "......KKKKKKMMMM",
      "......KKKKKMMGGG",
      "......RRRRMMGGGC",
      "......RRRRMMGGGC",
      "......RRRRMMMGGG",
      "......rRRRRMMMMM",
      "......rRRRRRRRRR",
      "......drRRRRRRRR",
      "........dRRRRRRR",
      "........dKKKKKKK",
      "........dKMMKKKK",
      "........dKKKKKKK",
      ".........drRRRRr",
      ".........dRRRRd.",
      ".........dRRRRd.",
      "........dKKKKKd.",
      "........KKKKKKK.",
    ], 0, 1 + (ctx.state === "attack" ? 0 : b));
    const lift = armLift(ctx, 5);
    mirrored(g, [
      "...kKK.",
      ".kKKKKK",
      "kKKKKKK",
      "kKKkRRR",
      "KKkRRRR",
      "KkRRRRR",
      "kRRRRRr",
      "RRRRRrr",
      "RRRRRrd",
      "RRRRrd.",
      "MMMMMd.",
      "RRRRRd.",
      "RRRRRd.",
      "rRRRrd.",
      ".rrr...",
    ], 0, 13 + lift + b);
    // Furnace chest roars while winding up.
    if (ctx.state === "telegraph" && ctx.charge >= 1) {
      for (const x of [14, 17]) setPixel(g, x, 16 + b, fx("C"));
      setPixel(g, 15, 15 + b, fx("W"));
      setPixel(g, 16, 15 + b, fx("W"));
    }
    if (ctx.state === "attack") {
      // Ground-slam shock pixels.
      [0, 3, 28, 31].forEach((x, i) => setPixel(g, x, 30 - (i % 2), fx("O")));
    }
  },
};

// ---------------------------------------------------------------------------
// Summoner — floating hooded warlock with orbiting runes.
// ---------------------------------------------------------------------------
const summoner: CreatureArt = {
  id: "boss-summoner",
  width: 32,
  height: 32,
  frameMs: 170,
  signature: "#b07dff",
  palette: {
    P: "#8a5ad8", p: "#4f2a8e", L: "#c9a8ff",
    K: "#150b24", E: "#ff4df0", G: "#ffd23f",
    S: "#7a4fc4", s: "#4b2a85", h: "#d8c8ff",
    Y: "#ff9cf5", O: "#f0a8ff", W: "#ffffff",
  },
  enragedPalette: { P: "#5a2a9a", p: "#2e1260", E: "#ffffff", Y: "#ff4df0" },
  draw: (g, ctx) => {
    const float = [0, 1, 1, 0][ctx.frame];
    const hemShift = ctx.frame % 2;
    mirrored(g, [
      "...............P",
      "..............PP",
      ".............PPP",
      "............pPPP",
      "...........pPPPP",
      "..........pPPPLP",
      ".........pPPPLPP",
      "........pPPPKKKK",
      "........pPPKKKKK",
      "........pPKKKEEK",
      "........pPKKKKKK",
      "........pPPKKKKK",
      ".......pPPPPKKKK",
      "......pPPPPPPPGG",
      ".....pPPPPPPPPPP",
      "....pPPPPPPPPPPP",
      "........pPPPPPPP",
      "........pPPPPPPP",
      "........pPPPPPPP",
      "........pPPPPYPP",
      "........pPPPPPYP",
      ".......pPPPPPPPY",
      "......pPPPPPPPPP",
      "......pPPPPPPPPP",
      ".....pPPPPPPPPPP",
      hemShift ? ".....pPpPPPPPpPP" : ".....pPPpPPPPpPP",
      hemShift ? ".......pp.pPPpPP" : "......pp.pPP.pPP",
      hemShift ? "..........pp..pP" : ".........pp...pP",
      "..............p.",
    ], 0, 1 + float);
    const lift = armLift(ctx, 6);
    mirrored(g, [
      "..sSSSs",
      ".sSSSSS",
      "sSSSSSS",
      "sSSSSSs",
      ".hh.sss",
      "hhh....",
    ], 1, 16 + float + lift);
    // Orbs cupped over each hand.
    const orbKey = ctx.state === "telegraph" ? fx("W") : fx("O");
    for (const x of [2, 29]) {
      setPixel(g, x, 19 + float + lift, orbKey);
      setPixel(g, x, 20 + float + lift, fx("O"));
    }
    // Runes orbit the warlock.
    const runes: [number, number][] = [
      [3, 6], [8, 1], [23, 1], [28, 6], [30, 14], [1, 14],
    ];
    runes.forEach(([x, y], i) => {
      if ((i + ctx.frame) % 3 === 0) {
        setPixel(g, x, y, fx("Y"));
        setPixel(g, x, y + 1, fx("Y"));
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Architect — builder mech with a blueprint monitor head and crane arms.
// ---------------------------------------------------------------------------
const architect: CreatureArt = {
  id: "boss-architect",
  width: 32,
  height: 30,
  frameMs: 150,
  signature: "#00e0e0",
  palette: {
    m: "#3b4a55", M: "#8fa3b0", B: "#0f5f73", b: "#3de0ff",
    E: "#ffffff", n: "#1b2228", Y: "#ffd23f", K: "#111418",
    T: "#00b3b3", t: "#006666", L: "#7ff5f5", C: "#00ffff",
    W: "#ffffff", R: "#ff3b3b",
  },
  enragedPalette: { B: "#5a0f1a", b: "#ff5a5a", T: "#008a8a", C: "#ff5a5a" },
  draw: (g, ctx) => {
    const b = breathe(ctx);
    mirrored(g, [
      "..........mmmmmm",
      ".........mMMMMMM",
      ".........MBBBBBB",
      ".........MBBBBBB",
      ".........MBBBEEB",
      ".........MBBBBBB",
      ".........MBBBBBB",
      ".........mMMMMMM",
      "............nnnn",
      "........YKYTTTTT",
      ".......YKYKtTTTT",
      ".......mmmmtTTLT",
      "...........tTTTC",
      "...........tTTCW",
      "...........tTTTC",
      "...........tTTTT",
      "...........ttttt",
      "..........nnnnnn",
      "..........nMMn..",
      ".........nMMMn..",
      ".........nMMMn..",
      "........nnnnnnn.",
    ], 0, 2 + b);
    // Scrolling blueprint grid on the monitor (asymmetric on purpose).
    const alarm = ctx.state === "telegraph" && ctx.frame % 2 === 0;
    for (let y = 4; y <= 8; y++) {
      for (let x = 10; x <= 21; x++) {
        if (alarm) {
          setPixel(g, x, y + b, "R");
        } else if ((x + ctx.frame) % 4 === 0 || (y + ctx.frame) % 3 === 0) {
          setPixel(g, x, y + b, "b");
        }
      }
    }
    setPixel(g, 13, 6 + b, "E");
    setPixel(g, 14, 6 + b, "E");
    setPixel(g, 17, 6 + b, "E");
    setPixel(g, 18, 6 + b, "E");
    // Crane arms.
    const lift = armLift(ctx, 4);
    mirrored(g, [
      "mmmmmm",
      "MMMMMm",
      "Mm....",
      "Mm....",
      "Mm....",
      "MMm...",
      "Y.Y...",
      "Y.Y...",
    ], 1, 13 + b + lift);
    if (ctx.state === "attack") {
      setPixel(g, 2, 22 + b, fx("C"));
      setPixel(g, 29, 22 + b, fx("C"));
    }
  },
};

// ---------------------------------------------------------------------------
// Glitch Golem — stone monolith leaking magenta corruption.
// ---------------------------------------------------------------------------
const glitchGolem: CreatureArt = {
  id: "boss-glitch-golem",
  width: 32,
  height: 30,
  frameMs: 190,
  signature: "#ff3dd4",
  palette: {
    S: "#7d7f8a", s: "#4a4c55", L: "#b4b7c2",
    K: "#1b1c22", G: "#ff3dd4", W: "#ffffff", O: "#c9b8a8",
  },
  enragedPalette: { S: "#6a5f78", s: "#3a2f48", G: "#ff7ae6" },
  draw: (g, ctx) => {
    const b = ctx.state === "attack" ? 1 : breathe(ctx);
    mirrored(g, [
      ".......G........",
      ".......GG.......",
      "......sGG.sSSSSS",
      "......sGsSSSLSSS",
      "......ssSSSKKKKK",
      ".......sSSSKGGKK",
      ".......sSSSSSSSS",
      ".......sSSLsSSSS",
      ".......SSSSSsSLS",
      ".......SLSSSSsSS",
      ".......SSSSsSSsG",
      ".......sSSSSSSGS",
      ".......sSSLSSSGS",
      ".......SSSSSSGSS",
      ".......SSsSSSGSS",
      ".......SSSSSSSGS",
      ".......sSSSLSSSG",
      "........sSSSSSSS",
      ".........sSSSSSS",
      "........sSSLSs..",
      "........sSSSSs..",
      "........sSSSSs..",
      ".......sssssss..",
    ], 0, 4 + b);
    // Eye glow.
    const eyeKey = ctx.state === "telegraph" ? fx("W") : fx("G");
    [12, 13, 18, 19].forEach((x) => setPixel(g, x, 9 + b, eyeKey));
    const lift = armLift(ctx, 6);
    mirrored(g, [
      "..sSSs.",
      ".sSLSSs",
      "sSSSSSs",
      "sSSsSSS",
      "SSSSSSs",
      "sSSSSSs",
      ".sSSSs.",
      "sSSSSSs",
      "SSLSSSS",
      "SSSSSSs",
      "sSSSSs.",
      ".sss...",
    ], 0, 11 + b + lift);
    // Glitch tear: shift a couple of rows sideways each frame.
    const tearRows = [[9, 20], [13, 23], [7, 17], [15, 22]][ctx.frame];
    tearRows.forEach((y, i) => {
      const row = g[y + b];
      if (!row) return;
      const dir = i === 0 ? 1 : -1;
      const copy = row.slice();
      for (let x = 0; x < row.length; x++) row[x] = copy[x - dir] ?? null;
      setPixel(g, dir > 0 ? 0 : 31, y + b, fx("G"));
    });
    if (ctx.enraged || ctx.state === "telegraph") {
      [[4, 3], [27, 5], [2, 26], [29, 24]].forEach(([x, y], i) => {
        if ((i + ctx.frame) % 2 === 0) setPixel(g, x, y, fx("G"));
      });
    }
    if (ctx.state === "attack") {
      [1, 5, 26, 30].forEach((x) => setPixel(g, x, 29, fx("O")));
    }
  },
};

// ---------------------------------------------------------------------------
// Viral Swarm — grinning spiked virion with orbiting spores.
// ---------------------------------------------------------------------------
const viralSwarm: CreatureArt = {
  id: "boss-viral-swarm",
  width: 32,
  height: 32,
  frameMs: 130,
  signature: "#3dff4a",
  palette: {
    V: "#3dff4a", v: "#16a02a", L: "#b8ffb0", N: "#d7ff5c",
    W: "#ffffff", K: "#0b2a0f", T: "#eaffd0",
  },
  enragedPalette: { V: "#a8ff1a", v: "#4f9e00", N: "#ff3b3b", K: "#3a0000" },
  draw: (g, ctx) => {
    const cx = 15.5;
    const cy = 15.5;
    const long = ctx.state === "telegraph";
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + ctx.frame * (Math.PI / 24);
      const len = 12.5 + ((k + ctx.frame) % 2) + (long ? 1.5 : 0);
      const x1 = cx + Math.cos(a) * 9;
      const y1 = cy + Math.sin(a) * 9;
      const x2 = cx + Math.cos(a) * len;
      const y2 = cy + Math.sin(a) * len;
      line(g, x1, y1, x2, y2, "v");
      ellipse(g, x2, y2, 0.9, 0.9, "N");
    }
    const squash = ctx.state === "attack" ? 1 : 0;
    ellipse(g, cx, cy, 9.5 + squash, 9.5 - squash, "V", "v", "L");
    // Face.
    rect(g, 10, 12, 4, 4, "W");
    rect(g, 18, 12, 4, 4, "W");
    const look = ctx.frame % 2;
    rect(g, 11 + look, 13, 2, 2, "K");
    rect(g, 19 + look, 13, 2, 2, "K");
    for (let x = 10; x <= 21; x++) {
      setPixel(g, x, 19 + ((x + ctx.frame) % 2), "K");
      if (x % 3 === 0) setPixel(g, x, 20 + ((x + ctx.frame) % 2), "T");
    }
    // Orbiting spores.
    for (let i = 0; i < 3; i++) {
      const a = ctx.frame * (Math.PI / 6) + (i * Math.PI * 2) / 3;
      setPixel(g, cx + Math.cos(a) * 14.5, cy + Math.sin(a) * 14.5, fx("N"));
    }
  },
};

// ---------------------------------------------------------------------------
// Overclocker — clockwork automaton with a racing clock-face chest.
// ---------------------------------------------------------------------------
const overclocker: CreatureArt = {
  id: "boss-overclocker",
  width: 32,
  height: 32,
  frameMs: 120,
  signature: "#ffe45c",
  palette: {
    B: "#c9921e", b: "#7a5510", Y: "#ffe45c",
    W: "#fff6d6", K: "#2a1f10", R: "#ff3b3b",
    M: "#8a8f9c", m: "#50545e", T: "#fff36b",
  },
  enragedPalette: { W: "#ffc2b0", B: "#ff7a1a", b: "#9a3a0a" },
  draw: (g, ctx) => {
    const b = breathe(ctx);
    // Legs.
    rect(g, 11, 25, 2, 5, "m");
    rect(g, 19, 25, 2, 5, "m");
    rect(g, 9, 29, 5, 2, "K");
    rect(g, 18, 29, 5, 2, "K");
    // Piston arms with gear fists.
    const lift = armLift(ctx, 4);
    for (const x of [3, 26]) {
      rect(g, x, 11 + b + lift, 3, 8, "M");
      rect(g, x, 11 + b + lift, 1, 8, "m");
      ellipse(g, x + 1, 21 + b + lift, 2.3, 2.3, "Y", "B");
      setPixel(g, x + 1, 21 + b + lift, "K");
    }
    // Head dome and winding key.
    ellipse(g, 15.5, 4 + b, 4, 2.5, "Y", "B");
    rect(g, 15, 0 + b, 2, 2, "B");
    rect(g, 13 + (ctx.frame % 2) * 2, 0 + b, 2, 1, "b");
    // Clock body.
    ellipse(g, 15.5, 15 + b, 10, 10, "B", "b", "Y");
    const glow = ctx.state === "telegraph" && ctx.frame % 2 === 0;
    ellipse(g, 15.5, 15 + b, 7.6, 7.6, glow ? "T" : "W");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      setPixel(g, 15.5 + Math.cos(a) * 6.6, 15 + b + Math.sin(a) * 6.6, "K");
    }
    // Hands spin: faster while charging.
    const speed = ctx.state === "idle" ? 1 : 3;
    const minute = -Math.PI / 2 + ctx.frame * speed * (Math.PI / 2);
    const hour = -Math.PI / 2 + ctx.frame * (Math.PI / 6);
    line(g, 15.5, 15 + b, 15.5 + Math.cos(minute) * 5.5, 15 + b + Math.sin(minute) * 5.5, "K");
    line(g, 15.5, 15 + b, 15.5 + Math.cos(hour) * 3.5, 15 + b + Math.sin(hour) * 3.5, "R");
    setPixel(g, 15.5, 15 + b, "R");
    if (ctx.state !== "idle") {
      [[1, 8], [30, 8], [2, 26], [29, 26]].forEach(([x, y], i) => {
        if ((i + ctx.frame) % 2 === 0) setPixel(g, x, y, fx("T"));
      });
    }
  },
};

// ---------------------------------------------------------------------------
// Magnetic Magnus — horseshoe-magnet-headed strongman crackling with arcs.
// ---------------------------------------------------------------------------
const magneticMagnus: CreatureArt = {
  id: "boss-magnetic-magnus",
  width: 32,
  height: 32,
  frameMs: 110,
  signature: "#ff3dff",
  palette: {
    R: "#ff3b4a", r: "#a01020", B: "#3b7bff", b: "#1a3aa0",
    S: "#e6ecf5", E: "#ffe45c",
    P: "#e000e0", p: "#8a008a", L: "#ff9cff",
    Y: "#ffd23f", C: "#d9823b", c: "#8a4a1a", Z: "#7df9ff", W: "#ffffff",
  },
  enragedPalette: { P: "#ff1a8c", p: "#9a0050", Z: "#ffffff" },
  draw: (g, ctx) => {
    const b = breathe(ctx);
    // Legs.
    rect(g, 11, 25, 4, 5, "p");
    rect(g, 17, 25, 4, 5, "p");
    rect(g, 10, 29, 5, 2, "b");
    rect(g, 17, 29, 5, 2, "r");
    // Torso.
    ellipse(g, 15.5, 19 + b, 8.5, 6.5, "P", "p", "L");
    rect(g, 9, 23 + b, 14, 2, "Y");
    for (let y = 16; y <= 21; y += 2) line(g, 13, y + b, 18, y + b, "C");
    // Coil arms.
    const lift = armLift(ctx, 5);
    for (const x of [3, 25]) {
      for (let y = 0; y < 8; y++) rect(g, x, 14 + y + b + lift, 4, 1, y % 2 ? "c" : "C");
      ellipse(g, x + 1.5, 24 + b + lift, 2.4, 2.2, "S");
    }
    // Horseshoe magnet head: red pole left, blue pole right.
    rect(g, 8, 2 + b, 5, 10, "R");
    rect(g, 8, 2 + b, 1, 10, "r");
    rect(g, 19, 2 + b, 5, 10, "B");
    rect(g, 23, 2 + b, 1, 10, "b");
    rect(g, 8, 10 + b, 8, 4, "R");
    rect(g, 16, 10 + b, 8, 4, "B");
    rect(g, 8, 1 + b, 5, 2, "S");
    rect(g, 19, 1 + b, 5, 2, "S");
    setPixel(g, 12, 11 + b, "E");
    setPixel(g, 13, 11 + b, "E");
    setPixel(g, 18, 11 + b, "E");
    setPixel(g, 19, 11 + b, "E");
    // Arc crackles between the poles.
    const arcs = ctx.state === "telegraph" ? 2 : 1;
    for (let a = 0; a < arcs; a++) {
      for (let x = 13; x <= 18; x++) {
        const zig = (x + ctx.frame + a) % 2;
        setPixel(g, x, 3 + a * 3 + zig + b, fx("Z"));
      }
    }
    if (ctx.state !== "idle") {
      setPixel(g, 2, 25 + b + lift, fx("Z"));
      setPixel(g, 29, 25 + b + lift, fx("Z"));
    }
  },
};

// ---------------------------------------------------------------------------
// Neon Reaper — hooded wraith with a glowing scythe.
// ---------------------------------------------------------------------------
const neonReaper: CreatureArt = {
  id: "boss-neon-reaper",
  width: 36,
  height: 32,
  frameMs: 150,
  signature: "#00f0ff",
  palette: {
    K: "#1f2a52", k: "#10162e", T: "#00f0ff",
    W: "#e8f4ff", E: "#00ffff", M: "#6b7690", w: "#ffffff",
  },
  enragedPalette: { E: "#ff2a6a", T: "#ff2a9a" },
  draw: (g, ctx) => {
    const float = [0, 1, 1, 0][ctx.frame];
    const hem = ctx.frame % 2;
    const body = mirror([
      "............kKKK",
      "..........kKKKKK",
      ".........kKKKKKK",
      "........kKKTTTTT",
      "........kKTKKKKK",
      "........kKTKWWWW",
      "........kKTKWEEW",
      "........kKTKWWWW",
      "........kKTKKWKW",
      ".......kKKTKKKKK",
      "......kKKKTTKKKK",
      ".....kKKKKKKTKKK",
      "....kKKKKKKKKTKK",
      "....kKKKKKKKKKTK",
      "...kKKKKKKKKKKKT",
      "...kKKKKKKKKKKKK",
      "..kKKKKKKKKKKKKK",
      "..kKKKKKKKKKKKKK",
      "..kKKKKKKKKKKKKK",
      ".kKKKKKKKKKKKKKK",
      hem ? ".kKKKKkKKKKkKKKK" : ".kKKKkKKKKkKKKKK",
      hem ? "..TkK.kKK.TkKK.k" : ".TkK.kKK.TkKK.kK",
      hem ? "..T.k..kT..Tk..." : ".T.k..kT..Tk...K",
      hem ? ".......T....T..." : "......T....T....",
    ]);
    rows(g, body, 0, 3 + float);
    // Scythe on the right: shaft, bony hand, neon blade.
    const raised = ctx.state === "telegraph" ? -2 : 0;
    const top = 3 + raised + float;
    line(g, 32, top, 33, 30 + float, "M");
    setPixel(g, 31, 16 + float, "W");
    setPixel(g, 32, 16 + float, "W");
    if (ctx.state === "attack") {
      // Blade swept down along the right side.
      for (let y = top; y <= top + 12; y++) {
        const bulge = Math.round(2.4 - Math.pow((y - top - 6) / 3, 2) * 0.5);
        for (let d = 0; d <= Math.max(0, bulge); d++) {
          setPixel(g, 33 + d, y, d === Math.max(0, bulge) ? "T" : "w");
        }
      }
    } else {
      // Crescent blade arcing over the hood.
      for (let x = 18; x <= 33; x++) {
        const y = top - 2 + Math.round(Math.pow((x - 27) / 6, 2) * 2.5);
        setPixel(g, x, y, "T");
        if (x >= 20 && x <= 32) setPixel(g, x, y + 1, "w");
        if (x >= 22 && x <= 31) setPixel(g, x, y + 2, "T");
      }
    }
    if (ctx.state === "telegraph") {
      setPixel(g, 13, 9 + float, fx("w"));
      setPixel(g, 20, 9 + float, fx("w"));
    }
  },
};

// ---------------------------------------------------------------------------
// Core Destroyer — armoured reactor sphere with a molten eye.
// ---------------------------------------------------------------------------
const coreDestroyer: CreatureArt = {
  id: "boss-core-destroyer",
  width: 36,
  height: 36,
  frameMs: 140,
  signature: "#ff8800",
  palette: {
    A: "#5a5f6e", a: "#2e313b", L: "#9aa0b0", n: "#14161c",
    O: "#ff8800", o: "#b34700", Y: "#ffd23f",
    K: "#120a05", R: "#ff2020", W: "#ffffff",
  },
  enragedPalette: { O: "#ff3b1f", o: "#8a1000", Y: "#ffe0a0", A: "#5a2a24" },
  draw: (g, ctx) => {
    const cx = 17.5;
    const cy = 17.5;
    ellipse(g, cx, cy, 16, 16, "A", "a", "L");
    // Rotating armour seams with glowing vents.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + ctx.frame * (Math.PI / 16);
      line(g, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, "n");
      setPixel(g, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, i % 2 === ctx.frame % 2 ? fx("O") : "n");
    }
    const hot = ctx.state === "telegraph";
    ellipse(g, cx, cy, 11, 11, hot ? "Y" : "O", "o", hot ? "W" : "Y");
    // The eye.
    const iris = hot ? 3.2 : 5;
    ellipse(g, cx, cy, iris, iris, "K");
    ellipse(g, cx, cy, iris * 0.45, iris * 0.45, "R");
    setPixel(g, cx - 2, cy - 2, "W");
    if (ctx.state === "attack") {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        setPixel(g, cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, fx("Y"));
      }
    }
  },
};

export const BOSS_ART: Record<BossType, CreatureArt> = {
  berserker,
  summoner,
  architect,
  "glitch-golem": glitchGolem,
  "viral-swarm": viralSwarm,
  overclocker,
  "magnetic-magnus": magneticMagnus,
  "neon-reaper": neonReaper,
  "core-destroyer": coreDestroyer,
};
