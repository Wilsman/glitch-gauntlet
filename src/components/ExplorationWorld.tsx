import { Circle, Group, Line, Rect, Text, Arc } from 'react-konva';
import type { ExplorationState } from '@shared/exploration';
import type { Player } from '@shared/types';
import { activeWalls, CHARGE_MS, GATE, LANDMARKS } from '@/lib/explorationWorld';

export default function ExplorationWorld({ world, player }: { world: ExplorationState; player?: Player }) {
  const { anchor, cache, elite } = world;
  const active = world.phase === 'anchorActive';
  const ready = world.phase === 'exitReady';
  return <Group listening={false}>
    <Rect width={world.width} height={world.height} fill="#111d29" />
    {LANDMARKS.map(area => <Group key={area.name}>
      <Rect {...area} fill={area.color} stroke="#4a6875" strokeWidth={2} cornerRadius={25} />
      <Text x={area.x + 28} y={area.y + 26} text={area.name} fill="#7f9ca8" fontFamily="monospace" fontSize={19} letterSpacing={3} />
    </Group>)}
    <Line points={[300, 1000, 550, 1300, 550, 1580, 1500, 1580, 1850, 1380, 2450, 1380, 2670, 1390]} stroke="#40616a" strokeWidth={5} opacity={0.65} dash={[24, 18]} lineJoin="round" />
    <Line points={[400, 1000, 120, 1000, 120, 90, 1340, 90, 1340, 350, 1800, 750, 2450, 750]} stroke="#40616a" strokeWidth={4} dash={[24, 18]} opacity={0.55} />
    {activeWalls(world).filter(w => w.x + w.width > world.camera.x - 50 && w.x < world.camera.x + 1330 && w.y + w.height > world.camera.y - 50 && w.y < world.camera.y + 770).map(w => <Group key={w.id}>
      <Rect x={w.x + 7} y={w.y + 9} width={w.width} height={w.height} fill="#080e17" cornerRadius={5} />
      <Rect x={w.x} y={w.y} width={w.width} height={w.height} fill={w.id === 'gate' ? '#4b3947' : '#304656'} stroke={w.id === 'gate' ? '#e0ae6a' : '#6d8794'} strokeWidth={2} cornerRadius={5} />
      <Line points={[w.x + 12, w.y + 9, w.x + w.width - 12, w.y + 9]} stroke={w.id === 'gate' ? '#e0ae6a' : '#92a6ae'} strokeWidth={3} opacity={0.6} />
      {w.width > 150 && <Line points={[w.x + 25, w.y + 25, w.x + w.width - 25, w.y + w.height - 25]} stroke="#435e6d" strokeWidth={12} />}
    </Group>)}
    <Text x={GATE.x - 90} y={GATE.y - 30} text={world.gateOpen ? 'SHORTCUT OPEN' : 'SERVICE GATE'} fontSize={14} fontFamily="monospace" fill="#e0ae6a" />
    <Group x={cache.position.x} y={cache.position.y}>
      <Rect x={-22} y={-18} width={44} height={36} fill={cache.claimed ? '#263b44' : '#255966'} stroke={cache.claimed ? '#53646a' : '#81dfd3'} strokeWidth={3} cornerRadius={4} />
      <Line points={[-18, 0, 18, 0]} stroke="#8ca6ac" strokeWidth={3} />
      <Text x={-100} y={-48} width={200} align="center" text={cache.claimed ? 'CACHE RECOVERED' : 'MAINTENANCE CACHE'} fill="#98d6d5" fontFamily="monospace" fontSize={14} />
    </Group>
    {!elite.defeated && <Group x={elite.position.x} y={elite.position.y}>
      <Circle radius={65} stroke="#ecaf71" strokeWidth={2} dash={[8, 8]} />
      {!elite.started && <Text text="!" x={-12} y={-25} fill="#f6c17c" fontSize={48} />}
      <Text x={-100} y={-100} width={200} align="center" text={elite.started ? 'ELITE ACTIVE' : 'OPTIONAL ELITE'} fill="#f6c17c" fontFamily="monospace" fontSize={15} />
    </Group>}
    <Group x={anchor.position.x} y={anchor.position.y}>
      <Circle radius={anchor.radius} fill={ready ? '#25493e' : '#204449'} opacity={active || ready ? 0.55 : 0.15} />
      <Circle radius={anchor.radius} stroke={ready ? '#91e8ae' : '#68c6d2'} strokeWidth={active ? 3 : 1} opacity={active || ready ? 0.9 : 0.3} dash={active ? undefined : [10, 18]} />
      {active && <Arc innerRadius={anchor.radius - 7} outerRadius={anchor.radius} angle={anchor.chargeMs / CHARGE_MS * 360} rotation={-90} fill="#a7f3d0" />}
      <Circle radius={65 + (world.elapsedMs % 2200) / 2200 * 100} stroke="#6de0e5" strokeWidth={2} opacity={1 - (world.elapsedMs % 2200) / 2200} />
      <Rect x={-29} y={-29} width={58} height={58} fill="#152935" stroke={ready ? '#91e8ae' : '#7de0e5'} strokeWidth={4} rotation={45} offsetX={-12} offsetY={12} />
      <Circle radius={15} fill={ready ? '#91e8ae' : '#9deaf0'} />
      <Text x={-180} y={-105} width={360} align="center" text={ready ? 'SIGNAL STABLE' : 'GLITCH ANCHOR'} fill="#b9f0f1" fontFamily="monospace" fontSize={20} letterSpacing={2} />
    </Group>
    {world.spawnWarnings?.map((warning, i) => <Circle key={i} x={warning.position.x} y={warning.position.y} radius={24 + warning.remainingMs / 50} stroke="#f0ae81" opacity={0.7} strokeWidth={2} dash={[6, 6]} />)}
    {player && world.established && <Circle x={player.position.x} y={player.position.y} radius={160} fill="#79c7ac" opacity={0.07} stroke="#9cd9b0" strokeWidth={3} />}
    {player && world.slideMs > 0 && <Circle x={player.position.x} y={player.position.y} radius={29} stroke="#a0f3ed" strokeWidth={3} />}
  </Group>;
}
