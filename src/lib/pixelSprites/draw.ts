import { setPixel, type ArtStyle, type Grid } from "./engine";

/** Animation inputs for enemies and bosses. */
export interface CreatureContext {
  /** 0-3, loops. */
  frame: number;
  moving: boolean;
  /** Winding up an attack / attacking / neutral. */
  state: "idle" | "telegraph" | "attack";
  /** 0-3 bucketed telegraph progress (3 = about to go off). */
  charge: number;
  /** Boss phase 2 / enraged, elite, pack alpha etc. */
  enraged: boolean;
}

export interface CreatureArt extends ArtStyle {
  width: number;
  height: number;
  draw: (g: Grid, ctx: CreatureContext) => void;
  /** Frame duration in ms for the idle/move loop. */
  frameMs?: number;
  /** Whether the art is authored facing right and should mirror by motion. */
  directional?: boolean;
  /** Palette overrides applied while enraged / phase 2 / elite. */
  enragedPalette?: Record<string, string>;
}

/** Build full rows from left halves (mirrored around the centre). */
export function mirror(halfRows: string[]): string[] {
  return halfRows.map((row) => row + row.split("").reverse().join(""));
}

export function rows(g: Grid, lines: string[], x: number, y: number) {
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r];
    for (let c = 0; c < line.length; c++) {
      const key = line[c];
      if (key === "." || key === " ") continue;
      setPixel(g, x + c, y + r, key);
    }
  }
}

export function rect(g: Grid, x: number, y: number, w: number, h: number, key: string) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(g, xx, yy, key);
  }
}

/**
 * Filled ellipse centred on (cx, cy). `shade` is used for the lower-right
 * rim and `light` for an upper-left highlight to give chunky volume.
 */
export function ellipse(
  g: Grid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  key: string,
  shade?: string,
  light?: string,
) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / (rx + 0.35);
      const ny = (y - cy) / (ry + 0.35);
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      let k = key;
      if (shade && d > 0.55 && nx + ny > 0.45) k = shade;
      else if (light && nx < -0.15 && ny < -0.25 && d > 0.3 && d < 0.75) k = light;
      setPixel(g, x, y, k);
    }
  }
}

export function line(
  g: Grid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  key: string,
) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 128; i++) {
    setPixel(g, x, y, key);
    if (x === tx && y === ty) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Mirror whatever is on the left half of the grid onto the right half. */
export function mirrorGrid(g: Grid) {
  const w = g[0].length;
  for (let y = 0; y < g.length; y++) {
    for (let x = 0; x < Math.floor(w / 2); x++) {
      if (g[y][x] !== null) g[y][w - 1 - x] = g[y][x];
    }
  }
}

export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
