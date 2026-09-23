import { Group, Line, Rect } from 'react-konva';
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

// Screen-space post effects for the open map: vignette, CRT lines, speed lines, damage and impact flashes.
export default function ExplorationScreenFX({ world, player, now }: { world: ExplorationState; player: Player; now: number }) {
  const speed = world.boostMs > 0 ? 1 : player.characterType === 'dash-dynamo' ? Math.max(0, (world.momentum - 0.55) / 0.45) : 0;
  const hurt = world.hurtMs / 380;
  const milestone = world.combo.milestoneMs > 1600 ? (world.combo.milestoneMs - 1600) / 400 : 0;
  return <Group listening={false}>
    <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fillRadialGradientStartPoint={{ x: CX, y: CY }} fillRadialGradientEndPoint={{ x: CX, y: CY }} fillRadialGradientStartRadius={VIEW_HEIGHT * 0.45} fillRadialGradientEndRadius={VIEW_WIDTH * 0.72} fillRadialGradientColorStops={[0, 'rgba(2,4,12,0)', 1, 'rgba(2,4,12,0.78)']} />
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
    <Rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fillPatternImage={scanlinePattern() as unknown as HTMLImageElement} opacity={0.22} />
  </Group>;
}
