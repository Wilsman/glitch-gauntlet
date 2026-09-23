import { useEffect, useState } from 'react';
import { Arc, Circle, Group, Image as KonvaImage, Line, Rect, RegularPolygon, Ring, Text } from 'react-konva';
import type { ExplorationState, WorldChest } from '@shared/exploration';
import type { Player } from '@shared/types';
import { CHARGE_MS, GATE, VIEW_HEIGHT, VIEW_WIDTH } from '@/lib/explorationWorld';
import { bakeExplorationArt, CONDUITS } from '@/lib/explorationArt';

const PIXEL_FONT = '"Press Start 2P", monospace';
let bakedArt: HTMLCanvasElement | null = null;

export default function ExplorationWorld({ world, player, now }: { world: ExplorationState; player?: Player; now: number }) {
  const [art, setArt] = useState<HTMLCanvasElement | null>(bakedArt);
  useEffect(() => {
    if (bakedArt) return;
    let alive = true;
    const bake = () => { bakedArt = bakedArt || bakeExplorationArt(world); if (alive) setArt(bakedArt); };
    document.fonts.load('22px "Press Start 2P"').then(bake, bake);
    return () => { alive = false; };
  }, [world]);
  const { anchor, cache, elite, camera } = world;
  const inView = (x: number, y: number, pad = 120) => x > camera.x - pad && x < camera.x + VIEW_WIDTH + pad && y > camera.y - pad && y < camera.y + VIEW_HEIGHT + pad;
  const coins = Math.floor(player?.coins || 0);
  return <Group listening={false}>
    {art
      ? <KonvaImage image={art} x={camera.x} y={camera.y} width={VIEW_WIDTH} height={VIEW_HEIGHT} crop={{ x: camera.x, y: camera.y, width: VIEW_WIDTH, height: VIEW_HEIGHT }} />
      : <Rect width={world.width} height={world.height} fill="#070b14" />}
    <ConduitPulses now={now} inView={inView} />
    <AmbientMotes camera={camera} now={now} />
    <Gate open={world.gateOpen} now={now} />
    {world.pads.filter(p => inView(p.position.x, p.position.y)).map(pad => <BoostPadView key={pad.id} x={pad.position.x} y={pad.position.y} angle={pad.angle} now={now} />)}
    {world.chests.filter(c => inView(c.position.x, c.position.y)).map(chest => <ChestView key={chest.id} chest={chest} now={now} affordable={coins >= chest.cost} />)}
    {inView(cache.position.x, cache.position.y) && <Group x={cache.position.x} y={cache.position.y}>
      <Circle radius={44} fill="#5eead4" opacity={cache.claimed ? 0.03 : 0.1 + Math.sin(now / 300) * 0.04} />
      <Rect x={-24} y={-18} width={48} height={36} fill={cache.claimed ? '#16222b' : '#0f3b44'} stroke={cache.claimed ? '#334155' : '#5eead4'} strokeWidth={3} cornerRadius={5} />
      <Rect x={-16} y={-4} width={32} height={6} fill={cache.claimed ? '#334155' : '#99f6e4'} cornerRadius={2} />
      <Text x={-110} y={-50} width={220} align="center" text={cache.claimed ? 'CACHE LOOTED' : 'MAINTENANCE CACHE'} fill={cache.claimed ? '#475569' : '#99f6e4'} fontFamily={PIXEL_FONT} fontSize={10} />
    </Group>}
    {!elite.defeated && inView(elite.position.x, elite.position.y, 200) && <Group x={elite.position.x} y={elite.position.y}>
      <Ring innerRadius={62} outerRadius={70} fill="#f59e0b" opacity={0.18 + Math.sin(now / 200) * 0.08} />
      <Circle radius={80} stroke="#fbbf24" strokeWidth={2} dash={[10, 10]} rotation={now / 30} opacity={0.8} />
      {!elite.started && <Text text="☠" x={-20} y={-24} fill="#fbbf24" fontSize={40} opacity={0.7 + Math.sin(now / 150) * 0.3} />}
      <Text x={-120} y={-112} width={240} align="center" text={elite.started ? 'ELITE ACTIVE' : 'ELITE CHALLENGE'} fill="#fcd34d" fontFamily={PIXEL_FONT} fontSize={11} />
    </Group>}
    {inView(anchor.position.x, anchor.position.y, anchor.radius + 400) && <AnchorView world={world} now={now} />}
    {world.spawnWarnings?.map((warning, i) => {
      const t = warning.remainingMs / 900;
      return <Group key={i} x={warning.position.x} y={warning.position.y}>
        <Rect x={-14 - t * 20} y={-14 - t * 20} width={28 + t * 40} height={28 + t * 40} stroke="#f43f5e" strokeWidth={2} rotation={45 * t} opacity={0.8} />
        <Circle radius={6 + (1 - t) * 8} fill="#f43f5e" opacity={0.25 + (1 - t) * 0.4} />
      </Group>;
    })}
    {player && world.established && <Group x={player.position.x} y={player.position.y}>
      <Circle radius={160} fill="#34d399" opacity={0.06} />
      <Circle radius={160} stroke="#6ee7b7" strokeWidth={3} dash={[14, 10]} rotation={now / 25} opacity={0.8} />
    </Group>}
    {player && (world.slideMs > 0 || world.boostMs > 0) && <Ring x={player.position.x} y={player.position.y} innerRadius={26} outerRadius={31} fill={world.boostMs > 0 ? '#22d3ee' : '#a5f3fc'} opacity={0.8} />}
  </Group>;
}

export function ExplorationFX({ world }: { world: ExplorationState }) {
  return <Group listening={false}>
    {world.fx.map(fx => {
      const t = 1 - fx.ms / fx.maxMs;
      const opacity = Math.max(0, 1 - t);
      if (fx.kind === 'ring') return <Ring key={fx.id} x={fx.position.x} y={fx.position.y} innerRadius={Math.max(0, fx.size * t - 6 - 10 * (1 - t))} outerRadius={fx.size * t + 2} fill={fx.color} opacity={opacity * 0.8} />;
      if (fx.kind === 'burst') return <Group key={fx.id} x={fx.position.x} y={fx.position.y} opacity={opacity}>
        <Circle radius={fx.size * 0.5 * (1 - t)} fill="#ffffff" opacity={0.8} />
        {Array.from({ length: 8 }, (_, i) => {
          const angle = i * Math.PI / 4 + fx.id;
          const d = fx.size * (0.3 + t * 1.2);
          const s = Math.max(2, fx.size / 7 * (1 - t));
          return <Rect key={i} x={Math.cos(angle) * d - s / 2} y={Math.sin(angle) * d - s / 2} width={s} height={s} fill={i % 2 ? fx.color : '#ffffff'} />;
        })}
      </Group>;
      if (fx.kind === 'beam') return <Group key={fx.id} x={fx.position.x} y={fx.position.y} opacity={opacity}>
        <Rect x={-fx.size / 2} y={-900} width={fx.size} height={900} fillLinearGradientStartPoint={{ x: 0, y: 900 }} fillLinearGradientEndPoint={{ x: 0, y: 0 }} fillLinearGradientColorStops={[0, fx.color, 1, 'rgba(0,0,0,0)']} opacity={0.55} />
        <Rect x={-fx.size / 6} y={-900} width={fx.size / 3} height={900} fillLinearGradientStartPoint={{ x: 0, y: 900 }} fillLinearGradientEndPoint={{ x: 0, y: 0 }} fillLinearGradientColorStops={[0, '#ffffff', 1, 'rgba(255,255,255,0)']} opacity={0.7} />
      </Group>;
      const lift = t * 50;
      return <Text key={fx.id} x={fx.position.x - 300} y={fx.position.y - lift} width={600} align="center" text={fx.text} fontFamily={PIXEL_FONT} fontSize={fx.size * (t < 0.12 ? 0.6 + t / 0.12 * 0.4 : 1)} fill={fx.color} stroke="#020617" strokeWidth={5} fillAfterStrokeEnabled opacity={t > 0.7 ? (1 - t) / 0.3 : 1} />;
    })}
  </Group>;
}

function polylineLength(points: number[]) {
  let length = 0;
  for (let i = 2; i < points.length; i += 2) length += Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
  return length;
}

function pointAlong(points: number[], distanceAlong: number) {
  for (let i = 2; i < points.length; i += 2) {
    const segment = Math.hypot(points[i] - points[i - 2], points[i + 1] - points[i - 1]);
    if (distanceAlong <= segment) {
      const t = distanceAlong / segment;
      return { x: points[i - 2] + (points[i] - points[i - 2]) * t, y: points[i - 1] + (points[i + 1] - points[i - 1]) * t };
    }
    distanceAlong -= segment;
  }
  return { x: points[points.length - 2], y: points[points.length - 1] };
}

const CONDUIT_LENGTHS = CONDUITS.map(c => polylineLength(c.points));

function ConduitPulses({ now, inView }: { now: number; inView: (x: number, y: number) => boolean }) {
  return <>{CONDUITS.flatMap((conduit, ci) => Array.from({ length: 6 }, (_, k) => {
    const length = CONDUIT_LENGTHS[ci];
    const p = pointAlong(conduit.points, (now * 0.35 + k * length / 6 + ci * 300) % length);
    if (!inView(p.x, p.y)) return null;
    return <Group key={`${ci}-${k}`} x={p.x} y={p.y}>
      <Circle radius={11} fill={conduit.color} opacity={0.25} />
      <Circle radius={4} fill="#ffffff" />
    </Group>;
  }))}</>;
}

function AmbientMotes({ camera, now }: { camera: { x: number; y: number }; now: number }) {
  return <>{Array.from({ length: 34 }, (_, i) => {
    const w = VIEW_WIDTH + 80, h = VIEW_HEIGHT + 80;
    const x = camera.x - 40 + (((i * 397 + now * 0.012 * (1 + (i % 3))) % w) + w) % w;
    const y = camera.y - 40 + (((i * 211 - now * 0.02 * (1 + (i % 2))) % h) + h) % h;
    return <Rect key={i} x={x} y={y} width={i % 5 ? 2 : 4} height={i % 5 ? 2 : 4} fill={i % 3 ? '#67e8f9' : '#f0abfc'} opacity={0.2 + 0.25 * Math.abs(Math.sin(now / 900 + i))} />;
  })}</>;
}

function Gate({ open, now }: { open: boolean; now: number }) {
  const x = GATE.x - 60, y = GATE.y;
  return <Group>
    <Rect x={x} y={y} width={120} height={80} stroke={open ? '#334155' : '#fbbf24'} strokeWidth={2} dash={[6, 6]} />
    {!open && <>
      <Rect x={x} y={y} width={120} height={80} fill="#f59e0b" opacity={0.14 + Math.abs(Math.sin(now / 120)) * 0.12} />
      {Array.from({ length: 6 }, (_, i) => <Line key={i} points={[x + 10 + i * 20, y, x + 10 + i * 20 + Math.sin(now / 90 + i) * 6, y + 80]} stroke="#fde68a" strokeWidth={2} opacity={0.6} />)}
    </>}
    <Text x={GATE.x - 120} y={GATE.y - 26} width={240} align="center" text={open ? 'SHORTCUT OPEN' : 'SERVICE GATE // LOCKED'} fontSize={10} fontFamily={PIXEL_FONT} fill={open ? '#64748b' : '#fcd34d'} />
  </Group>;
}

function BoostPadView({ x, y, angle, now }: { x: number; y: number; angle: number; now: number }) {
  return <Group x={x} y={y}>
    <Circle radius={52} fill="#22d3ee" opacity={0.08 + Math.abs(Math.sin(now / 250)) * 0.06} />
    <RegularPolygon sides={6} radius={42} fill="#06121f" stroke="#22d3ee" strokeWidth={3} rotation={30} />
    <Group rotation={angle * 180 / Math.PI}>
      {[0, 1, 2].map(i => {
        const offset = ((now / 6 + i * 18) % 54) - 27;
        return <Line key={i} points={[offset - 8, -14, offset + 6, 0, offset - 8, 14]} stroke="#a5f3fc" strokeWidth={5} lineCap="round" lineJoin="round" opacity={1 - Math.abs(offset) / 30} />;
      })}
    </Group>
  </Group>;
}

function ChestView({ chest, now, affordable }: { chest: WorldChest; now: number; affordable: boolean }) {
  const bob = Math.sin(now / 260 + chest.position.x) * 4;
  const price = <Text x={-60} y={-66 + bob} width={120} align="center" text={`$${chest.cost}`} fontFamily={PIXEL_FONT} fontSize={12} fill={affordable ? '#fde047' : '#f87171'} stroke="#020617" strokeWidth={4} fillAfterStrokeEnabled />;
  if (chest.kind === 'shrine') {
    const color = chest.opened ? '#475569' : '#f472b6';
    return <Group x={chest.position.x} y={chest.position.y}>
      <Circle radius={48} fill={color} opacity={chest.opened ? 0.04 : 0.1 + Math.sin(now / 200) * 0.04} />
      <Rect x={-26} y={10} width={52} height={14} fill="#1e1b2e" stroke={color} strokeWidth={2} cornerRadius={3} />
      <Rect x={-12} y={-24} width={24} height={36} fill="#140f22" stroke={color} strokeWidth={2} />
      {[0, 1, 2].map(i => <Rect key={i} x={-8} y={-18 + i * 10} width={16} height={4} fill={color} opacity={0.4 + 0.4 * Math.abs(Math.sin(now / 200 + i))} />)}
      <Rect x={0} y={-44 + bob} width={20} height={20} offsetX={10} offsetY={10} rotation={now / 8} fill={color} opacity={0.9} scaleY={0.8 + Math.sin(now / 150) * 0.2} />
      <Text x={-80} y={36} width={160} align="center" text={chest.opened ? 'SHRINE SPENT' : 'SHRINE OF CHANCE'} fontFamily={PIXEL_FONT} fontSize={8} fill={color} />
      {!chest.opened && price}
    </Group>;
  }
  const large = chest.kind === 'large';
  const color = large ? '#facc15' : '#22d3ee';
  const w = large ? 64 : 42, h = large ? 40 : 28;
  const open = chest.opened;
  const lidLift = open ? Math.min(1, chest.openedMs / 250) : 0;
  return <Group x={chest.position.x} y={chest.position.y}>
    {!open && large && <Group rotation={now / 20}>
      {Array.from({ length: 8 }, (_, i) => <Line key={i} points={[0, 0, Math.cos(i * Math.PI / 4) * 90, Math.sin(i * Math.PI / 4) * 90]} stroke="#fde047" strokeWidth={10} opacity={0.08} />)}
    </Group>}
    <Circle radius={w * 0.9} fill={color} opacity={open ? 0.03 : 0.1 + Math.sin(now / 240) * 0.04} />
    <Rect x={-w / 2} y={-h / 2 + 6} width={w} height={h} fill={open ? '#111827' : large ? '#2a1a05' : '#08202c'} stroke={open ? '#374151' : color} strokeWidth={3} cornerRadius={4} />
    {open && <Rect x={-w / 2 + 5} y={-h / 2 + 8} width={w - 10} height={8} fill={color} opacity={Math.max(0, 0.6 - chest.openedMs / 3000)} />}
    <Rect x={-w / 2 - 3} y={-h / 2 - 6 - lidLift * 16} width={w + 6} height={12} fill={open ? '#1f2937' : large ? '#a16207' : '#155e75'} stroke={open ? '#374151' : color} strokeWidth={2} cornerRadius={3} rotation={-lidLift * 12} />
    {!open && <Rect x={-5} y={-h / 2 + 2} width={10} height={10} fill={large ? '#f87171' : '#a5f3fc'} cornerRadius={2} opacity={0.6 + Math.abs(Math.sin(now / 180)) * 0.4} />}
    {large && <Text x={-80} y={h / 2 + 12} width={160} align="center" text={open ? 'VAULT EMPTY' : 'LEGENDARY VAULT'} fontFamily={PIXEL_FONT} fontSize={8} fill={open ? '#4b5563' : '#fde047'} />}
    {!open && price}
  </Group>;
}

function AnchorView({ world, now }: { world: ExplorationState; now: number }) {
  const { anchor } = world;
  const active = world.phase === 'anchorActive';
  const ready = world.phase === 'exitReady';
  const color = ready ? '#86efac' : active ? '#22d3ee' : '#67e8f9';
  const charge = anchor.chargeMs / CHARGE_MS;
  const pulse = (now % 2200) / 2200;
  return <Group x={anchor.position.x} y={anchor.position.y}>
    <Circle radius={anchor.radius} fillRadialGradientStartPoint={{ x: 0, y: 0 }} fillRadialGradientEndPoint={{ x: 0, y: 0 }} fillRadialGradientStartRadius={0} fillRadialGradientEndRadius={anchor.radius} fillRadialGradientColorStops={[0, active || ready ? `${color}55` : `${color}14`, 0.8, active || ready ? `${color}22` : `${color}08`, 1, `${color}00`]} />
    <Circle radius={anchor.radius} stroke={color} strokeWidth={active ? 4 : 2} opacity={active || ready ? 0.95 : 0.35} dash={active ? [30, 12] : [10, 18]} rotation={now / 60} />
    <Circle radius={anchor.radius * 0.62} stroke={color} strokeWidth={2} opacity={0.4} dash={[4, 14]} rotation={-now / 35} />
    {active && <>
      <Arc innerRadius={anchor.radius - 14} outerRadius={anchor.radius - 2} angle={charge * 360} rotation={-90} fill="#a7f3d0" opacity={0.9} />
      <Arc innerRadius={anchor.radius - 20} outerRadius={anchor.radius + 6} angle={charge * 360} rotation={-90} fill="#a7f3d0" opacity={0.15} />
      {!anchor.occupied && <Circle radius={anchor.radius} stroke="#f43f5e" strokeWidth={6} opacity={0.4 + Math.abs(Math.sin(now / 150)) * 0.4} />}
    </>}
    {!active && !ready && <Circle radius={70 + pulse * 150} stroke={color} strokeWidth={3} opacity={1 - pulse} />}
    {(active || ready) && <>
      <Rect x={-26} y={-1200} width={52} height={1200} fillLinearGradientStartPoint={{ x: 0, y: 1200 }} fillLinearGradientEndPoint={{ x: 0, y: 0 }} fillLinearGradientColorStops={[0, color, 1, 'rgba(0,0,0,0)']} opacity={0.35 + Math.sin(now / 120) * 0.1} />
      <Rect x={-7} y={-1200} width={14} height={1200} fillLinearGradientStartPoint={{ x: 0, y: 1200 }} fillLinearGradientEndPoint={{ x: 0, y: 0 }} fillLinearGradientColorStops={[0, '#ffffff', 1, 'rgba(255,255,255,0)']} opacity={0.7} />
    </>}
    <RegularPolygon sides={6} radius={62} fill="#061420" stroke={color} strokeWidth={4} rotation={now / 50} />
    <RegularPolygon sides={6} radius={44} stroke={color} strokeWidth={2} opacity={0.6} rotation={-now / 30} />
    {[0, 1, 2].map(i => {
      const a = now / 500 + i * Math.PI * 2 / 3;
      return <Rect key={i} x={Math.cos(a) * 92} y={Math.sin(a) * 92} width={16} height={16} offsetX={8} offsetY={8} rotation={45} fill={color} opacity={0.9} />;
    })}
    <Circle radius={18 + Math.sin(now / 140) * 3} fill={color} />
    <Circle radius={9} fill="#ffffff" />
    <Text x={-200} y={-128} width={400} align="center" text={ready ? 'SIGNAL STABLE' : active ? `STABILISING ${Math.floor(charge * 100)}%` : 'GLITCH ANCHOR'} fill="#ecfeff" fontFamily={PIXEL_FONT} fontSize={16} stroke="#020617" strokeWidth={5} fillAfterStrokeEnabled />
  </Group>;
}
