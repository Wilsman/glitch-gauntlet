import type { CharacterType, PetCoat } from "@shared/types";
import {
  FX_PREFIX,
  setPixel,
  type CharacterArt,
  type FrameContext,
  type Grid,
  type Part,
} from "./engine";

/**
 * Character pixel art. All grids face RIGHT on a 24x24 canvas; renderers
 * mirror them for left-facing. One character per palette key:
 *   '.' = transparent, anything else = palette[key].
 * Keep silhouettes chunky — the outline pass adds a 1px dark border.
 */

const part = (x: number, y: number, rows: string[]): Part => ({ x, y, rows });
const fx = (key: string) => `${FX_PREFIX}${key}`;

// ---------------------------------------------------------------------------
// Spray 'n' Pray — punk gunner: pink mohawk, shades, teal jacket, twin SMG.
// ---------------------------------------------------------------------------
const sprayNPray: CharacterArt = {
  id: "spray-n-pray",
  signature: "#ff4fa3",
  palette: {
    P: "#ff4fa3", p: "#b0226b",
    S: "#f7c59f", s: "#c98763",
    G: "#141424", W: "#ffffff",
    T: "#2ee6d6", t: "#138f86",
    n: "#2a2e40", m: "#5b6479", M: "#b8c2d6",
    L: "#3d4266", l: "#272a45",
    F: "#ff4fa3", f: "#a3246a",
    Y: "#ffe45c",
  },
  upper: part(6, 0, [
    "....PP......",
    "...PPPp.....",
    "...pPPPp....",
    "..sSSSSSS...",
    "..sSSSSSSS..",
    "..sSGGGGGG..",
    "..sSSGWSGW..",
    "..sSSSSSSS..",
    "...sSSSSs...",
    "....sSs.....",
    "..tTTTTTT...",
    ".tTTPPTTTt..",
    ".tTTTPTTTt..",
    ".tTTTTPTtSS.",
    "..tTTTTTTSS.",
    "..nnnnnnnn..",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 9, frontX: 12, width: 2,
    pants: "L", pantsShade: "l", boot: "F", bootShade: "f",
  },
  weapon: () =>
    part(13, 12, [
      ".mMMMMMW",
      "nnnPPnnn",
      ".mMMMMMW",
      "..nn....",
      "..nn....",
    ]),
  muzzle: { x: 21, y: 13, size: 1 },
  extras: (g, ctx) => {
    // Ejected shell casings arc up and back while firing.
    if (ctx.attackFrame >= 0) {
      setPixel(g, 14 - ctx.attackFrame * 2, 10 - ctx.attackFrame + ctx.bob, fx("Y"));
    }
    // Mohawk flick on the idle breath.
    if (!ctx.moving && ctx.frame === 2) setPixel(g, 11, 1, "P");
    if (ctx.moving) setPixel(g, 9, 0, "p");
  },
};

// ---------------------------------------------------------------------------
// Boom Bringer — stocky demolitions bruiser with a shoulder launcher.
// ---------------------------------------------------------------------------
const boomBringer: CharacterArt = {
  id: "boom-bringer",
  signature: "#ff8a2a",
  palette: {
    v: "#4b5524", V: "#6f7d3a",
    g: "#1f7f8f", G: "#7df9ff",
    S: "#d99a6c", s: "#a86a44", E: "#1b1410",
    O: "#ff8a2a", o: "#b8561a",
    B: "#3a2a1e", Y: "#ffd24a",
    n: "#2f3438", m: "#5a6166", M: "#9aa3a8",
    R: "#ff4a1f",
  },
  upper: part(5, 2, [
    "....vVVVVv....",
    "...vVVVVVVv...",
    "...VgGGgGGVv..",
    "...sSSSSSSSs..",
    "...sSSSSSSSS..",
    "...sSSSESSES..",
    "...sSSSSSSSS..",
    "....sSsssSs...",
    ".oOOOOOOOOOOo.",
    "oOOBOOOOOOOOOo",
    "oOOOBYOOOOOOSS",
    "oOOOOBYOOOOOSS",
    "vOOOOOBYOOOOo.",
    ".vVVVVVVVVVVv.",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 8, frontX: 12, width: 3,
    pants: "V", pantsShade: "v", boot: "B", bootShade: "n",
  },
  weapon: () =>
    part(5, 9, [
      "mMMMMMMMMMMMMM",
      "nmmOOmmmmmmmmm",
      "..nn...nn.....",
    ]),
  muzzle: { x: 19, y: 10, size: 2 },
  extras: (g, ctx) => {
    // Grenade on the belt with a fizzing fuse.
    setPixel(g, 7, 14 + ctx.bob, "n");
    setPixel(g, 7, 15 + ctx.bob, "n");
    const sparkHigh = ctx.frame % 2 === 0;
    setPixel(g, sparkHigh ? 7 : 6, (sparkHigh ? 12 : 13) + ctx.bob, fx(sparkHigh ? "Y" : "O"));
    setPixel(g, 7, 13 + ctx.bob, "R");
    // Back-blast puff from the launcher.
    if (ctx.attackFrame === 0) {
      setPixel(g, 3, 9 + ctx.bob, fx("W"));
      setPixel(g, 2, 10 + ctx.bob, fx("O"));
      setPixel(g, 3, 11 + ctx.bob, fx("O"));
    }
  },
};

// ---------------------------------------------------------------------------
// Glass Cannon Carl — spindly sniper in a (cracking) glass dome helmet.
// ---------------------------------------------------------------------------
const CARL_CRACKS: [number, number][][] = [
  [],
  [
    [13, 2],
    [14, 3],
    [13, 4],
  ],
  [
    [13, 2],
    [14, 3],
    [13, 4],
    [9, 4],
    [10, 5],
    [9, 6],
    [11, 1],
  ],
];

const glassCannonCarl: CharacterArt = {
  id: "glass-cannon-carl",
  signature: "#8fd3ff",
  palette: {
    a: "#5fb6e0", A: "#bfeaff", W: "#ffffff",
    S: "#f0c6a0", s: "#c18f6a",
    n: "#313a48", R: "#ff3860",
    d: "#1d2c4a", D: "#2c416b",
    i: "#3f86b8", I: "#8fd3ff",
    m: "#6b7686", M: "#c9d2dc",
    x: "#22506e",
  },
  upper: part(7, 1, [
    "...aaaa....",
    "..aAAWWa...",
    ".aASSSSWa..",
    ".aSSSnRRa..",
    ".aSSSSnna..",
    ".aASsSSAa..",
    "..aaaaaa...",
    "...dDDd....",
    "..iIIIIi...",
    "..iIDIIi...",
    "..iIDIISS..",
    "..iIDIIi...",
    "..iIIIIi...",
    "...dDDd....",
  ]),
  legs: {
    hipY: 15, length: 7, backX: 10, frontX: 12, width: 2,
    pants: "D", pantsShade: "d", boot: "n",
  },
  weapon: () =>
    part(7, 10, [
      "....nMMn......",
      "nnmmmmmmmmmmMW",
      "nn.mm.........",
    ]),
  muzzle: { x: 21, y: 11, size: 1 },
  extras: (g, ctx) => {
    // Scope glint on the idle loop.
    if (!ctx.moving && ctx.frame === 3) {
      setPixel(g, 13, 4 + ctx.bob, fx("W"));
    }
    const level = Math.max(0, Math.min(2, ctx.damageLevel));
    CARL_CRACKS[level].forEach(([x, y]) => setPixel(g, x, y + ctx.bob, "x"));
  },
};

// ---------------------------------------------------------------------------
// Dachshund Dan — cap, sunny hoodie, tennis-ball launcher.
// ---------------------------------------------------------------------------
const dachshundDan: CharacterArt = {
  id: "pet-pal-percy",
  signature: "#ffc93c",
  palette: {
    c: "#5c2f19", C: "#8a4b2a", H: "#4a2c1a",
    S: "#f2c29a", s: "#c48c63", E: "#2b1d14",
    y: "#d18f1c", Y: "#ffc93c", W: "#ffffff",
    L: "#6b4a2e", l: "#4a321e",
    F: "#f2ede4", f: "#a49c92",
    m: "#52739a", M: "#8fb4d9",
    G: "#c8f542", g: "#86b01e",
  },
  upper: part(6, 3, [
    "...cCCCCc...",
    "..cCCCCCCCCC",
    "..HSSSSSSS..",
    "..HSSSSESS..",
    "..sSSSSSSS..",
    "..sSSSSSSs..",
    "...sSSSSs...",
    "..yYYYYYYy..",
    ".yYYYWYYYYy.",
    ".yYYYYYYYSS.",
    ".yYYyyyyYSS.",
    ".yYYyYYyYYy.",
    "..yyyyyyyy..",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 9, frontX: 12, width: 2, pantsRows: 2,
    pants: "L", pantsShade: "l", skin: "S", skinShade: "s",
    boot: "F", bootShade: "f",
  },
  weapon: () =>
    part(14, 11, [
      ".mMMMMGg",
      "mMMMMMGG",
      ".mm.....",
    ]),
  muzzle: { x: 22, y: 12, size: 1 },
  extras: (g, ctx) => {
    // Loaded ball pops out when firing, then reloads.
    if (ctx.attackFrame === 0) {
      setPixel(g, 20, 11 + ctx.bob, "M");
      setPixel(g, 20, 12 + ctx.bob, "M");
    }
    // Cheery wave with the back hand while idle.
    if (!ctx.moving && ctx.attackFrame < 0 && ctx.frame >= 2) {
      setPixel(g, 7, 9 + ctx.bob, "S");
      setPixel(g, 6, 8 + ctx.bob, "S");
    }
  },
};

// ---------------------------------------------------------------------------
// Vampire Vex — high-collared cape with crimson lining, pale face, fangs.
// ---------------------------------------------------------------------------
function drawVexHem(g: Grid, ctx: FrameContext) {
  const flutter = ctx.frame % 2;
  if (ctx.moving) {
    // Cape billows out behind (left) while running.
    for (let x = 3; x <= 18; x++) setPixel(g, x, 16, x === 4 ? "k" : "K");
    for (let x = 2 + flutter; x <= 17; x++) setPixel(g, x, 17, "K");
    [2, 3, 7, 8, 12, 16].forEach((x) => setPixel(g, x + flutter, 18, "K"));
    setPixel(g, 1 + flutter, 17, "r");
  } else {
    for (let x = 5; x <= 18; x++) setPixel(g, x, 16, x === 6 ? "k" : "K");
    for (let x = 5; x <= 18; x++) setPixel(g, x, 17, "K");
    [5, 6, 9, 10, 13, 14, 17, 18].forEach((x, i) =>
      setPixel(g, x, 18 + ((i + flutter) % 4 === 0 ? 1 : 0), "K"),
    );
  }
}

const VEX_BAT_ORBIT: [number, number][] = [
  [2, 4],
  [20, 3],
  [21, 14],
  [1, 13],
];

const vampireVex: CharacterArt = {
  id: "vampire-vex",
  signature: "#ff2d55",
  outline: "#07040a",
  palette: {
    H: "#0e0a14", P: "#ece4f5", p: "#a99bbd",
    E: "#ff2d55", W: "#ffffff",
    R: "#d4163c", r: "#8a0c26",
    K: "#2e1a3e", k: "#5a3878",
    G: "#ffcf4a",
    L: "#1a1022", l: "#0e0a14", F: "#3a2a4a",
    M: "#c9b8d8", m: "#6d5a80",
  },
  upper: part(4, 1, [
    "......HHHH......",
    "....HHHPHHH.....",
    "..R.HPPPPPP..R..",
    "..RRpPPPPEP.RR..",
    "..RRpPPPPPPRRR..",
    "..RRRpPWPWpRRR..",
    "..KRRRpPPpRRRK..",
    ".KkKRRRGGRRRKkK.",
    ".KkKKrRRRRrKKkK.",
    "KkKKKKrRRrKKKPPK",
    "KkKKKKKrrKKKKPPK",
    "KkKKKKKKKKKKKKkK",
    "KkKKKKKKKKKKKKkK",
    "KkKKKKKKKKKKKKkK",
    ".KkKKKKKKKKKKkK.",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 9, frontX: 12, width: 2,
    pants: "L", pantsShade: "l", boot: "F",
  },
  weapon: () =>
    part(17, 10, [
      "mMMMW",
      "mmGm.",
      ".mm..",
    ]),
  muzzle: { x: 22, y: 10, size: 1 },
  extras: (g, ctx) => {
    drawVexHem(g, ctx);
    // Eyes flare red when firing.
    if (ctx.attackFrame >= 0) setPixel(g, 12, 4 + ctx.bob, fx("W"));
    if (ctx.abilityActive) {
      VEX_BAT_ORBIT.forEach((_, i) => {
        const [bx, by] = VEX_BAT_ORBIT[(i + ctx.frame) % VEX_BAT_ORBIT.length];
        const flap = (ctx.frame + i) % 2 === 0 ? -1 : 0;
        setPixel(g, bx, by, "K");
        setPixel(g, bx - 1, by + flap, "k");
        setPixel(g, bx + 1, by + flap, "k");
        setPixel(g, bx, by + 1, fx("E"));
      });
    }
  },
};

// ---------------------------------------------------------------------------
// Turret Tina — hard hat, orange braid, overalls, radio backpack, rivet cannon.
// ---------------------------------------------------------------------------
const turretTina: CharacterArt = {
  id: "turret-tina",
  signature: "#ffd23f",
  palette: {
    A: "#ff3b3b", a: "#7a1d1d",
    p: "#4b545e", P: "#7b8590",
    y: "#c99a12", Y: "#ffd23f",
    H: "#d9542b", h: "#a0381a",
    S: "#f0b88f", s: "#bf8460", E: "#2a1f1a",
    t: "#1a7a70", T: "#2bb3a3", B: "#f4f1e8",
    n: "#2d3138", m: "#5d6570", M: "#aeb8c2",
    F: "#6b4426", f: "#452a15",
  },
  upper: part(5, 3, [
    ".a...........",
    ".p...yYYYYy..",
    ".p..yYYYYYYYY",
    "pPp.HSSSSSS..",
    "pPPpHSSSESS..",
    "pPPpHhSSSSS..",
    "pPPp.hSSSSs..",
    "pPPptTBBBBt..",
    "pPPtTTTTTTTt.",
    "pPPtTYTTTTSS.",
    "pPPtTTTTTTSS.",
    ".ppttTTTTTTt.",
    "....tttttttt.",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 10, frontX: 13, width: 2,
    pants: "T", pantsShade: "t", boot: "F", bootShade: "f",
  },
  weapon: () =>
    part(14, 11, [
      ".yYYYyn.",
      "mMMMMMMn",
      "mMMMMMMn",
      ".mm.yy..",
    ]),
  muzzle: { x: 22, y: 12, size: 2 },
  extras: (g, ctx) => {
    // Antenna beacon: slow blink normally, strobing during Mega Deploy.
    const lit = ctx.abilityActive ? ctx.frame % 2 === 0 : ctx.frame === 0;
    setPixel(g, 6, 3 + ctx.bob, lit ? fx("A") : "a");
    if (lit) setPixel(g, 6, 2 + ctx.bob, fx("W"));
  },
};

// ---------------------------------------------------------------------------
// Dash Dynamo — visor speedster with a streaming lightning scarf.
// ---------------------------------------------------------------------------
const dashDynamo: CharacterArt = {
  id: "dash-dynamo",
  signature: "#3df2ff",
  palette: {
    H: "#2a1f4a", S: "#f0b890", s: "#c08462",
    v: "#1aa5c4", V: "#3df2ff", W: "#ffffff",
    z: "#20b8d0", Z: "#5ff8ff",
    u: "#4a2aa8", U: "#7b4dff", Y: "#fff15a",
    n: "#262a3a", M: "#b8c4e0",
    F: "#ffffff", f: "#9aa0b8",
  },
  upper: part(6, 4, [
    "....HHHHH...",
    "...HHHHHHH..",
    "...HSSSSSS..",
    "...HvVVVVVW.",
    "...HSSSSSS..",
    "....sSSSs...",
    ".zZZZZZZ....",
    "..uUUYUUU...",
    "..uUYYUUUSS.",
    "..uUUYUUUSS.",
    "..uUUUUUUu..",
    "...uuuuuu...",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 9, frontX: 12, width: 2,
    pants: "U", pantsShade: "u", boot: "F", bootShade: "f",
  },
  weapon: () =>
    part(15, 12, [
      "nMMMMW",
      "nnMMMM",
      ".nn...",
    ]),
  muzzle: { x: 21, y: 12, size: 2 },
  extras: (g, ctx) => {
    // Scarf tail streams behind; longer and wavier at speed.
    const length = ctx.moving || ctx.abilityActive ? 6 : 3;
    for (let i = 1; i <= length; i++) {
      const wave = ctx.moving ? ((i + ctx.frame) % 4 < 2 ? 0 : 1) : i > 2 ? 1 : 0;
      setPixel(g, 7 - i, 10 + wave + ctx.bob, i % 2 === 0 ? "z" : "Z");
    }
    // Speed sparks off the heels.
    if (ctx.moving) {
      setPixel(g, 7 - (ctx.frame % 2), 21, fx("Y"));
    }
    if (ctx.abilityActive) {
      setPixel(g, 4, 13 + (ctx.frame % 2), fx("Y"));
      setPixel(g, 3, 16 - (ctx.frame % 2), fx("W"));
    }
  },
};

// ---------------------------------------------------------------------------
// True Melee (null-ronin) — straw hat, glitch-lined cloak, twin katanas.
// ---------------------------------------------------------------------------
const RONIN_IDLE_BLADE = part(16, 11, [
  "nY....",
  ".YM...",
  "..mM..",
  "...mM.",
  "....mM",
]);

const RONIN_SWING: Part[] = [
  // Wind-up: blade raised high.
  part(16, 4, [
    ".....M",
    "....Mm",
    "...Mm.",
    "..Mm..",
    ".Mm...",
    "Y.....",
    "n.....",
  ]),
  // Cut: blade levelled straight out.
  part(16, 10, [
    "nYMMMMMW",
    "n.mmmmm.",
  ]),
  // Follow-through: blade swept low.
  part(16, 11, [
    "nY.....",
    "..Mm...",
    "...Mm..",
    "....Mm.",
    ".....MW",
  ]),
];

const nullRonin: CharacterArt = {
  id: "null-ronin",
  signature: "#7dd3fc",
  palette: {
    t: "#a88a3a", T: "#e8c872",
    d: "#111a2e", D: "#1e2a44",
    S: "#f0c29c", s: "#c08d68", E: "#7dd3fc",
    b: "#3b8fc0", B: "#7dd3fc",
    Y: "#fde047", y: "#c9a50e",
    M: "#e8f6ff", m: "#9ec9e6", W: "#ffffff",
    n: "#2a2a3a", l: "#0b1120", G: "#ff3dd4",
  },
  back: (ctx) =>
    ctx.attackFrame >= 0
      ? null
      : part(3, 2, [
          "M...",
          "mM..",
          ".mM.",
          "..bn",
        ]),
  upper: part(5, 2, [
    ".....tTTt.....",
    "...tTTTTTTt...",
    ".tTTTTTTTTTTt.",
    "....dSSSSSd...",
    "....dSSESEd...",
    "....dsSSSSd...",
    "...bBBBBBBBb..",
    "..dDDDBDDDDd..",
    ".dDDDDBDDDDSS.",
    ".dDBDDDBDDDSS.",
    ".dDDDDDDDDDd..",
    ".dDDYYYYYDDd..",
    "..dDDDDDDDDd..",
    "..d.dDDDDd.d..",
  ]),
  legs: {
    hipY: 16, length: 6, backX: 9, frontX: 12, width: 2,
    pants: "D", pantsShade: "l", boot: "n",
  },
  weapon: (ctx) =>
    ctx.attackFrame >= 0
      ? RONIN_SWING[Math.min(ctx.attackFrame, RONIN_SWING.length - 1)]
      : RONIN_IDLE_BLADE,
  attackFrames: 3,
  extras: (g, ctx) => {
    // Glitch scanline tear across the cloak every few frames.
    const glitching = ctx.abilityActive || ctx.frame === 1;
    if (glitching) {
      const row = 11 + ((ctx.frame * 3) % 4) + ctx.bob;
      setPixel(g, 5, row, fx("G"));
      setPixel(g, 6, row, fx("G"));
      setPixel(g, 16, row - 2, fx("E"));
    }
    // Afterglow trail on the cut frame.
    if (ctx.attackFrame === 1) {
      setPixel(g, 22, 9 + ctx.bob, fx("W"));
      setPixel(g, 23, 10 + ctx.bob, fx("E"));
      setPixel(g, 22, 12 + ctx.bob, fx("E"));
    }
  },
};

export const CHARACTER_ART: Record<CharacterType, CharacterArt> = {
  "spray-n-pray": sprayNPray,
  "boom-bringer": boomBringer,
  "glass-cannon-carl": glassCannonCarl,
  "pet-pal-percy": dachshundDan,
  "vampire-vex": vampireVex,
  "turret-tina": turretTina,
  "dash-dynamo": dashDynamo,
  "null-ronin": nullRonin,
};

// ---------------------------------------------------------------------------
// Dachshund companion (Dan's pet). Long, low, very good.
// ---------------------------------------------------------------------------
const DOG_LEG_POSES: [number, number][] = [
  [0, 0],
  [1, -1],
  [0, 0],
  [-1, 1],
];

const DAPPLE_SPOTS: [number, number][] = [
  [5, 16], [7, 15], [8, 15], [8, 16], [11, 17], [12, 16], [15, 12],
];

// B body, b shade, e ear, t tan points (brows/muzzle/chest/paws), d dapple spots.
export const DACHSHUND_COATS: Record<
  PetCoat,
  { label: string; swatch: string; palette: Record<string, string> }
> = {
  red: {
    label: "Red",
    swatch: "#b8692f",
    palette: { B: "#b8692f", b: "#7a3e17", e: "#5a2c10", t: "#d08a4c", d: "#b8692f" },
  },
  "black-tan": {
    label: "Black & Tan",
    swatch: "#3a3033",
    palette: { B: "#3a3033", b: "#1f1a1c", e: "#241d1f", t: "#c07a3c", d: "#3a3033" },
  },
  "chocolate-tan": {
    label: "Chocolate & Tan",
    swatch: "#6b4028",
    palette: { B: "#6b4028", b: "#442616", e: "#361d10", t: "#c9925a", d: "#6b4028" },
  },
  cream: {
    label: "Cream",
    swatch: "#e6c68e",
    palette: { B: "#e6c68e", b: "#bf985c", e: "#a57a45", t: "#f3ddb0", d: "#e6c68e" },
  },
  dapple: {
    label: "Dapple",
    swatch: "#8e8e9c",
    palette: { B: "#3a3033", b: "#1f1a1c", e: "#241d1f", t: "#c07a3c", d: "#9c9cab" },
  },
};

export const PET_COATS = Object.keys(DACHSHUND_COATS) as PetCoat[];

export const DACHSHUND_ART: CharacterArt = {
  id: "dachshund-red",
  signature: "#ffb36b",
  palette: {
    ...DACHSHUND_COATS.red.palette,
    E: "#111111", N: "#1a1a1a", R: "#ff4b4b", Y: "#ffd23f",
  },
  upper: part(3, 11, [
    "............BBt...",
    "...........BBBEB..",
    "...........eBBBttN",
    "...........eBBttb.",
    "..BBBBBBBBBRYbb...",
    ".bBBBBBBBBBBtt....",
    ".bBBBBBBBBBBBb....",
  ]),
  // Dog legs are drawn in extras; this keeps the shared leg pass empty.
  legs: {
    hipY: 30, length: 0, backX: 0, frontX: 0, width: 0,
    pants: "b", pantsShade: "b", boot: "b",
  },
  weapon: () => null,
  extras: (g, ctx) => {
    const [a, b] = ctx.moving ? DOG_LEG_POSES[ctx.frame % 4] : [0, 0];
    const legs: [number, number][] = [
      [5 + a, 18],
      [6 + b, 18],
      [15 + b, 18],
      [16 + a, 18],
    ];
    legs.forEach(([x, y], i) => {
      setPixel(g, x, y, i % 2 === 0 ? "b" : "B");
      setPixel(g, x, y + 1, "t");
    });
    DAPPLE_SPOTS.forEach(([x, y]) => setPixel(g, x, y, "d"));
    // Tail wag.
    const up = ctx.frame % 2 === 0;
    setPixel(g, 4, 14, "b");
    setPixel(g, 3, up ? 13 : 14, "b");
    setPixel(g, 2, up ? 12 : 14, "B");
    // Ear flops while trotting.
    if (ctx.moving && ctx.frame % 2 === 1) setPixel(g, 13, 16, "e");
  },
};
