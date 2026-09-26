import { Group, Image as KonvaImage, Line, Rect } from 'react-konva';
import type { ExplorationState } from '@shared/exploration';
import type { Player } from '@shared/types';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@/lib/explorationWorld';

const CX = VIEW_WIDTH / 2, CY = VIEW_HEIGHT / 2;
let scanlines: HTMLCanvasElement | null = null;
function scanlinePattern() {
  if (scanlines) return scanlines;
  scanlines = document.createElement('canvas');
  scanlines.width = 4; scanlines.height = 4;
  const ctx = scanlines.getContext('2d')!;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 4, 1);
  return scanlines;
}

// Static screen treatments are baked once into images: a full-screen radial gradient or pattern fill is
// re-rasterised per pixel on every frame, while a pre-rendered image is a single cheap blit.
let staticOverlay: HTMLCanvasElement | null = null;
function staticOverlayImage() {
  if (staticOverlay) return staticOverlay;
  staticOverlay = document.createElement('canvas');
  staticOverlay.width = VIEW_WIDTH; staticOverlay.height = VIEW_HEIGHT;
  const ctx = staticOverlay.getContext('2d')!;
  const vignette = ctx.createRadialGradient(CX, CY, VIEW_HEIGHT * 0.45, CX, CY, VIEW_WIDTH * 0.72);
  vignette.addColorStop(0, 'rgba(2,4,12,0)'); vignette.addColorStop(1, 'rgba(2,4,12,0.78)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.globalAlpha = 0.22; ctx.fillStyle = ctx.createPattern(scanlinePattern(), 'repeat')!;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  return staticOverlay;
}

// Darkness halo, twice the view size so it covers the screen wherever the player stands; drawn offset.
let darknessHalo: HTMLCanvasElement | null = null;
function darknessImage() {
  if (darknessHalo) return darknessHalo;
  darknessHalo = document.createElement('canvas');
  darknessHalo.width = VIEW_WIDTH * 2; darknessHalo.height = VIEW_HEIGHT * 2;
  const ctx = darknessHalo.getContext('2d')!;
  const gradient = ctx.createRadialGradient(VIEW_WIDTH, VIEW_HEIGHT, 140, VIEW_WIDTH, VIEW_HEIGHT, 300);
  gradient.addColorStop(0, 'rgba(1,2,8,0)'); gradient.addColorStop(0.6, 'rgba(1,2,8,0.82)'); gradient.addColorStop(1, 'rgba(1,2,8,0.97)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW_WIDTH * 2, VIEW_HEIGHT * 2);
  return darknessHalo;
}

/** Vignette + CRT lines. Its props never change, so its Konva layer is drawn once and never redrawn. */
export function ExplorationStaticFX() {
  return <KonvaImage image={staticOverlayImage()} width={VIEW_WIDTH} height={VIEW_HEIGHT} listening={false} />;
}

// Screen-space post effects for the open map: vignette, CRT lines, speed lines, damage and impact flashes.
export default function ExplorationScreenFX({ world, player, now }: { world: ExplorationState; player: Player; now: number }) {
  const speed = world.boostMs > 0 ? 1 : player.characterType === 'dash-dynamo' ? Math.max(0, (world.momentum - 0.55) / 0.45) : 0;
  const hurt = world.hurtMs / 380;
  const milestone = world.combo.milestoneMs > 1600 ? (world.combo.milestoneMs - 1600) / 400 : 0;
  // Curse of the Dark: screen-space darkness with a ~260px light pool around the player.
  const px = Math.max(0, Math.min(VIEW_WIDTH, player.position.x - world.camera.x));
  const py = Math.max(0, Math.min(VIEW_HEIGHT, player.position.y - world.camera.y));
  const warp = world.warpMs / 700;
  return <Group listening={false}>
    {world.modifier === 'darkness' && <KonvaImage image={darknessImage()} x={px - VIEW_WIDTH} y={py - VIEW_HEIGHT} width={VIEW_WIDTH * 2} height={VIEW_HEIGHT * 2} />}
    {speed > 0 && Array.from({ length: 30 }, (_, i) => {
      const angle = i * Math.PI * 2 / 30 + Math.sin(i * 12.9) * 0.1;
      const inner = 330 + ((now * 1.6 + i * 137) % 260);
      const length = 90 + (i % 4) * 40;
      return <Line key={i} points={[CX + Math.cos(angle) * inner * 1.45, CY + Math.sin(angle) * inner, CX + Math.cos(angle) * (inner + length) * 1.45, CY + Math.sin(angle) * (inner + length)]} stroke={i % 3 ? '#e0f2fe' : '#67e8f9'} strokeWidth={i % 2 ? 2 : 3} opacity={0.15 + speed * 0.4} />;
    })}
    {hurt > 0 && <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fillRadialGradientStartPoint={{ x: CX, y: CY }} fillRadialGradientEndPoint={{ x: CX, y: CY }} fillRadialGradientStartRadius={VIEW_HEIGHT * 0.3} fillRadialGradientEndRadius={VIEW_WIDTH * 0.62} fillRadialGradientColorStops={[0, 'rgba(244,63,94,0)', 1, 'rgba(244,63,94,0.55)']} opacity={hurt} />}
    {world.hitStopMs > 0 && <>
      <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#ffffff" opacity={0.07} />
      {[0, 1, 2, 3].map(i => <Rect key={i} x={0} y={((now * 7 + i * 191) % VIEW_HEIGHT)} width={VIEW_WIDTH} height={6 + i * 4} fill={i % 2 ? '#22d3ee' : '#f0abfc'} opacity={0.18} />)}
    </>}
    {milestone > 0 && <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#facc15" opacity={milestone * 0.18} />}
    {warp > 0 && <>
      <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#e0e7ff" opacity={Math.sin(Math.min(1, warp) * Math.PI) * 0.85} />
      <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fillRadialGradientStartPoint={{ x: CX, y: CY }} fillRadialGradientEndPoint={{ x: CX, y: CY }} fillRadialGradientStartRadius={VIEW_HEIGHT * (0.7 - warp * 0.5)} fillRadialGradientEndRadius={VIEW_WIDTH * 0.7} fillRadialGradientColorStops={[0, 'rgba(34,211,238,0)', 1, 'rgba(34,211,238,0.6)']} opacity={warp} />
    </>}
  </Group>;
}
