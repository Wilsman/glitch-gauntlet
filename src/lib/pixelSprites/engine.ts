/**
 * Code-only pixel sprite engine.
 *
 * Characters are authored as small palette-keyed string grids (see
 * characters.ts). A frame is composed from layers — back, legs, upper body,
 * weapon, extras — on a 24x24 authoring grid, then an automatic dark outline
 * and (optionally) a soft signature-colour rim are added so sprites stay
 * readable on any floor. Frames are rasterised once at 1 art pixel = 1 canvas
 * pixel and cached; renderers upscale them with smoothing disabled.
 */

export const ART_SIZE = 24;
export const ART_PAD = 2;
export const CANVAS_SIZE = ART_SIZE + ART_PAD * 2;

/** Palette key reserved for the auto-generated outline. */
const OUTLINE_KEY = "#";
/** Palette key reserved for the auto-generated signature rim. */
const RIM_KEY = "%";
/** Palette key reserved for pixels that should never be outlined (FX). */
export const FX_PREFIX = "*";

export type Grid = (string | null)[][];

export interface Part {
  rows: string[];
  x: number;
  y: number;
}

export interface LegStyle {
  /** Sprite-space y where the legs start. */
  hipY: number;
  /** Total leg length including the boot row. */
  length: number;
  /** Left edge of the back and front leg (facing right). */
  backX: number;
  frontX: number;
  width: number;
  /** Rows (from the hip) drawn in pants colours before switching to skin. */
  pantsRows?: number;
  pants: string;
  pantsShade: string;
  skin?: string;
  skinShade?: string;
  boot: string;
  bootShade?: string;
}

export interface FrameContext {
  /** 0-3, loops. */
  frame: number;
  moving: boolean;
  /** -1 when not attacking, otherwise 0..n. */
  attackFrame: number;
  abilityActive: boolean;
  /** Vertical bob applied to the upper body this frame. */
  bob: number;
  /** 0..1 health fraction bucketed for damage-state art. */
  damageLevel: number;
}

export interface CharacterArt {
  id: string;
  palette: Record<string, string>;
  /** Signature colour used for the rim light and in-game glow. */
  signature: string;
  outline?: string;
  back?: (ctx: FrameContext) => Part | null;
  legs: LegStyle;
  upper: Part;
  weapon: (ctx: FrameContext) => Part | null;
  /** Muzzle position (sprite space, before recoil) for gun flashes. */
  muzzle?: { x: number; y: number; size: number };
  /** Draw per-frame details on top (scarves, sparks, capes...). */
  extras?: (g: Grid, ctx: FrameContext) => void;
  /** Frames the attack animation lasts, used by the animation resolver. */
  attackFrames?: number;
}

export function createGrid(): Grid {
  return Array.from({ length: ART_SIZE }, () =>
    Array<string | null>(ART_SIZE).fill(null),
  );
}

export function setPixel(g: Grid, x: number, y: number, key: string | null) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (iy < 0 || iy >= g.length || ix < 0 || ix >= g[0].length) return;
  g[iy][ix] = key;
}

export function stamp(g: Grid, part: Part, dx = 0, dy = 0) {
  for (let row = 0; row < part.rows.length; row++) {
    const line = part.rows[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === "." || key === " ") continue;
      setPixel(g, part.x + col + dx, part.y + row + dy, key);
    }
  }
}

/** Walk cycle offsets: [backDx, backLift, frontDx, frontLift]. */
const RUN_POSES: [number, number, number, number][] = [
  [-1, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, -1, 0],
  [0, 0, 0, 1],
];

function drawLeg(
  g: Grid,
  style: LegStyle,
  x: number,
  lift: number,
  isBack: boolean,
) {
  const pantsRows = style.pantsRows ?? style.length;
  const bootY = style.hipY + style.length - 1 - lift;
  for (let y = style.hipY; y < bootY; y++) {
    const inPants = y - style.hipY < pantsRows;
    const main = inPants ? style.pants : (style.skin ?? style.pants);
    const shade = inPants ? style.pantsShade : (style.skinShade ?? style.pantsShade);
    for (let i = 0; i < style.width; i++) {
      setPixel(g, x + i, y, isBack || i === 0 ? shade : main);
    }
  }
  // Boots poke one pixel forward (facing right).
  for (let i = 0; i <= style.width; i++) {
    setPixel(
      g,
      x + i,
      bootY,
      isBack && style.bootShade ? style.bootShade : style.boot,
    );
  }
}

export function drawLegs(g: Grid, style: LegStyle, ctx: FrameContext) {
  const pose = ctx.moving ? RUN_POSES[ctx.frame % 4] : [0, 0, 0, 0];
  drawLeg(g, style, style.backX + pose[0], pose[1], true);
  drawLeg(g, style, style.frontX + pose[2], pose[3], false);
}

function drawMuzzleFlash(
  g: Grid,
  x: number,
  y: number,
  size: number,
  frame: number,
) {
  // Frame 0 is the big bloom, frame 1 the fading spark.
  const big = frame === 0;
  setPixel(g, x, y, `${FX_PREFIX}W`);
  setPixel(g, x + 1, y, `${FX_PREFIX}Y`);
  if (big) {
    setPixel(g, x, y - 1, `${FX_PREFIX}Y`);
    setPixel(g, x, y + 1, `${FX_PREFIX}Y`);
    setPixel(g, x + 2, y, `${FX_PREFIX}O`);
    if (size > 1) {
      setPixel(g, x + 1, y - 1, `${FX_PREFIX}O`);
      setPixel(g, x + 1, y + 1, `${FX_PREFIX}O`);
      setPixel(g, x + 3, y, `${FX_PREFIX}O`);
    }
  }
}

const FX_COLORS: Record<string, string> = {
  W: "#ffffff",
  Y: "#fff36b",
  O: "#ff9f1c",
};

export function composeFrame(art: CharacterArt, ctx: FrameContext): Grid {
  const g = createGrid();
  const back = art.back?.(ctx);
  if (back) stamp(g, back, 0, ctx.bob);
  drawLegs(g, art.legs, ctx);
  stamp(g, art.upper, 0, ctx.bob);

  const weapon = art.weapon(ctx);
  const recoil = ctx.attackFrame === 0 && art.muzzle ? -1 : 0;
  if (weapon) stamp(g, weapon, recoil, ctx.bob);
  if (art.muzzle && ctx.attackFrame >= 0 && ctx.attackFrame < 2) {
    drawMuzzleFlash(
      g,
      art.muzzle.x + recoil,
      art.muzzle.y + ctx.bob,
      art.muzzle.size,
      ctx.attackFrame,
    );
  }

  art.extras?.(g, ctx);

  if (ctx.abilityActive) {
    // Generic power-up sparkles circling the silhouette.
    const sparkPositions = [
      [3, 6],
      [20, 4],
      [2, 15],
      [21, 13],
      [6, 1],
      [17, 20],
    ];
    sparkPositions.forEach(([x, y], i) => {
      if ((i + ctx.frame) % 2 === 0) setPixel(g, x, y, `${FX_PREFIX}W`);
      else setPixel(g, x, y + 1, `${FX_PREFIX}Y`);
    });
  }
  return g;
}

export type RenderVariant = "normal" | "white" | "ghost" | "dead";

export interface RasterOptions {
  variant?: RenderVariant;
  rim?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function transformColor(
  rgb: [number, number, number],
  variant: RenderVariant,
): [number, number, number] {
  if (variant === "white") return [255, 255, 255];
  const lum = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
  if (variant === "dead") {
    const v = Math.round(lum * 0.7 + 20);
    return [v, v, Math.min(255, v + 12)];
  }
  if (variant === "ghost") {
    return [
      Math.round(lum * 0.55 + 110),
      Math.round(lum * 0.45 + 90),
      Math.min(255, Math.round(lum * 0.4 + 170)),
    ];
  }
  return rgb;
}

/**
 * Rasterise a composed grid into a CANVAS_SIZE square canvas, adding the
 * outline (and optional rim) around every non-FX pixel.
 */
export function rasterize(
  art: CharacterArt,
  grid: Grid,
  options: RasterOptions = {},
): HTMLCanvasElement {
  const variant = options.variant ?? "normal";
  const size = CANVAS_SIZE;
  const layer: (string | null)[][] = Array.from({ length: size }, () =>
    Array<string | null>(size).fill(null),
  );
  for (let y = 0; y < ART_SIZE; y++) {
    for (let x = 0; x < ART_SIZE; x++) {
      layer[y + ART_PAD][x + ART_PAD] = grid[y][x];
    }
  }

  const isBody = (x: number, y: number) => {
    if (y < 0 || y >= size || x < 0 || x >= size) return false;
    const key = layer[y][x];
    return !!key && key !== OUTLINE_KEY && key !== RIM_KEY && !key.startsWith(FX_PREFIX);
  };
  const isFilled = (x: number, y: number) =>
    y >= 0 && y < size && x >= 0 && x < size && !!layer[y][x];

  // Outline: any empty pixel 4-adjacent to a body pixel.
  const outline: [number, number][] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (layer[y][x]) continue;
      if (isBody(x - 1, y) || isBody(x + 1, y) || isBody(x, y - 1) || isBody(x, y + 1)) {
        outline.push([x, y]);
      }
    }
  }
  outline.forEach(([x, y]) => (layer[y][x] = OUTLINE_KEY));

  if (options.rim) {
    const rim: [number, number][] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (layer[y][x]) continue;
        const touches = (nx: number, ny: number) =>
          isFilled(nx, ny) && layer[ny][nx] === OUTLINE_KEY;
        if (touches(x - 1, y) || touches(x + 1, y) || touches(x, y - 1) || touches(x, y + 1)) {
          rim.push([x, y]);
        }
      }
    }
    rim.forEach(([x, y]) => (layer[y][x] = RIM_KEY));
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return canvas;
  const image = ctx2d.createImageData(size, size);
  const outlineRgb = hexToRgb(art.outline ?? "#0b0810");
  const rimRgb = hexToRgb(art.signature);
  const colorCache = new Map<string, [number, number, number]>();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const key = layer[y][x];
      if (!key) continue;
      let rgb: [number, number, number];
      let alpha = 255;
      if (key === OUTLINE_KEY) {
        rgb = variant === "white" ? [255, 255, 255] : outlineRgb;
      } else if (key === RIM_KEY) {
        rgb = variant === "normal" ? rimRgb : transformColor(rimRgb, variant);
        alpha = 110;
      } else {
        let cached = colorCache.get(key);
        if (!cached) {
          const hex = key.startsWith(FX_PREFIX)
            ? (art.palette[key.slice(1)] ?? FX_COLORS[key.slice(1)] ?? "#ffffff")
            : (art.palette[key] ?? "#ff00ff");
          cached = transformColor(hexToRgb(hex), variant);
          colorCache.set(key, cached);
        }
        rgb = cached;
      }
      const i = (y * size + x) * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = alpha;
    }
  }
  ctx2d.putImageData(image, 0, 0);
  return canvas;
}
