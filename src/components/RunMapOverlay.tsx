import { motion } from "framer-motion";
import { Crown, Crosshair, PawPrint, ShoppingBag } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { getCharacter } from "@shared/characterConfig";
import type {
  BossType,
  CharacterType,
  RunMapEncounterType,
  RunMapNode,
  RunMapReward,
  RunMapRouteId,
  RunMapState,
} from "@shared/types";

interface RunMapOverlayProps {
  runMap: RunMapState;
  currentDepth: number;
  threatTier: number;
  onSelectNode: (nodeId: string) => void;
  localPlayerName?: string | null;
  localPlayerCharacterType?: CharacterType | null;
}

type RouteMeta = {
  label: string;
  tag: string;
  glow: string;
  stroke: string;
  coreGlow: string;
};

const ROUTE_ORDER: RunMapRouteId[] = ["north", "east", "south", "west"];
const ROUTE_META: Record<RunMapRouteId, RouteMeta> = {
  north: {
    label: "Broker Spoke",
    tag: "NORTH",
    glow: "rgba(250,204,21,0.38)",
    stroke: "rgba(250,204,21,0.8)",
    coreGlow: "shadow-[0_0_34px_rgba(250,204,21,0.18)]",
  },
  east: {
    label: "War Spoke",
    tag: "EAST",
    glow: "rgba(34,211,238,0.38)",
    stroke: "rgba(34,211,238,0.8)",
    coreGlow: "shadow-[0_0_34px_rgba(34,211,238,0.18)]",
  },
  south: {
    label: "Recovery Spoke",
    tag: "SOUTH",
    glow: "rgba(52,211,153,0.36)",
    stroke: "rgba(52,211,153,0.8)",
    coreGlow: "shadow-[0_0_34px_rgba(52,211,153,0.16)]",
  },
  west: {
    label: "Hunt Spoke",
    tag: "WEST",
    glow: "rgba(248,113,113,0.36)",
    stroke: "rgba(248,113,113,0.82)",
    coreGlow: "shadow-[0_0_34px_rgba(248,113,113,0.16)]",
  },
};

const ENCOUNTER_STYLES: Record<
  RunMapEncounterType,
  {
    Icon: ComponentType<{ className?: string }>;
    label: string;
    ring: string;
    glow: string;
    text: string;
    chip: string;
  }
> = {
  combat: {
    Icon: Crosshair,
    label: "COMBAT",
    ring: "border-cyan-400/70 bg-cyan-500/12",
    glow: "shadow-[0_0_22px_rgba(34,211,238,0.18)]",
    text: "text-cyan-200",
    chip: "border-cyan-400/45 bg-cyan-500/10 text-cyan-100",
  },
  hellhound: {
    Icon: PawPrint,
    label: "HELLHOUND",
    ring: "border-red-400/80 bg-red-500/12",
    glow: "shadow-[0_0_24px_rgba(248,113,113,0.2)]",
    text: "text-red-200",
    chip: "border-red-400/45 bg-red-500/10 text-red-100",
  },
  shop: {
    Icon: ShoppingBag,
    label: "SHOP",
    ring: "border-yellow-300/80 bg-yellow-400/12",
    glow: "shadow-[0_0_24px_rgba(250,204,21,0.2)]",
    text: "text-yellow-100",
    chip: "border-yellow-300/40 bg-yellow-400/10 text-yellow-100",
  },
  boss: {
    Icon: Crown,
    label: "BOSS",
    ring: "border-fuchsia-400/85 bg-fuchsia-500/14",
    glow: "shadow-[0_0_28px_rgba(217,70,239,0.22)]",
    text: "text-fuchsia-100",
    chip: "border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-100",
  },
};

const REWARD_STYLES: Record<
  RunMapReward["type"],
  {
    chip: string;
  }
> = {
  coins: { chip: "border-amber-300/45 bg-amber-400/12 text-amber-100" },
  heal: { chip: "border-emerald-300/45 bg-emerald-400/12 text-emerald-100" },
  shopDiscount: {
    chip: "border-yellow-300/45 bg-yellow-400/14 text-yellow-100",
  },
  shopStock: { chip: "border-violet-300/45 bg-violet-400/14 text-violet-100" },
  damageBoost: { chip: "border-rose-300/45 bg-rose-400/14 text-rose-100" },
};

function formatBossType(bossType: BossType) {
  return bossType
    .split("-")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function getNodeStyle(node: RunMapNode) {
  return ENCOUNTER_STYLES[node.encounterType];
}

function getBossChoices(nodes: RunMapNode[]) {
  return nodes
    .filter((node) => node.encounterType === "boss" && node.bossType)
    .sort(
      (a, b) => ROUTE_ORDER.indexOf(a.routeId) - ROUTE_ORDER.indexOf(b.routeId),
    );
}

function renderRewardChip(reward: RunMapReward) {
  const style = REWARD_STYLES[reward.type];
  return (
    <span
      key={`${reward.type}-${reward.label}`}
      className={`inline-flex items-center rounded-full border px-2 py-[2px] font-press-start text-[7px] tracking-[0.1em] ${style.chip}`}
      title={reward.description}
    >
      {reward.label}
    </span>
  );
}

function buildCurvePath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  center: { x: number; y: number },
) {
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const pull = 0.14;
  const control = {
    x: midpoint.x + (center.x - midpoint.x) * pull,
    y: midpoint.y + (center.y - midpoint.y) * pull,
  };
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const MAP_LAYOUT_PADDING = {
  top: 84,
  right: 300,
  bottom: 84,
  left: 92,
};
const DEFAULT_VIEWPORT_SIZE = { width: 1280, height: 720 };
const BASE_SCALE_OVERSHOOT = 1.06;

function renderMapNodeButton({
  runNode,
  selectable,
  visited,
  current,
  left,
  top,
  onSelectNode,
  onHoverNode,
}: {
  runNode: RunMapNode;
  selectable: boolean;
  visited: boolean;
  current: boolean;
  left: number;
  top: number;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
}) {
  const style = getNodeStyle(runNode);
  const Icon = style.Icon;
  const isBoss = runNode.encounterType === "boss";
  const size = isBoss ? 52 : 28;

  return (
    <button
      key={runNode.id}
      type="button"
      aria-disabled={!selectable}
      tabIndex={selectable ? 0 : -1}
      onClick={() => {
        if (!selectable) return;
        onSelectNode(runNode.id);
      }}
      onMouseEnter={() => onHoverNode(runNode.id)}
      onMouseLeave={() => onHoverNode(null)}
      onFocus={() => onHoverNode(runNode.id)}
      onBlur={() => onHoverNode(null)}
      data-map-node-id={runNode.id}
      data-map-node-depth={runNode.depth}
      data-map-node-type={runNode.encounterType}
      data-map-node-route={runNode.routeId}
      data-map-node-selectable={selectable ? "true" : "false"}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200 ${
        style.ring
      } ${style.glow} ${
        selectable
          ? "cursor-pointer hover:scale-[1.06] hover:border-white/80 hover:bg-white/10"
          : visited
            ? "cursor-help opacity-95 hover:scale-[1.03] hover:border-white/45 hover:bg-white/6"
            : "cursor-help opacity-72 hover:scale-[1.03] hover:border-white/45 hover:bg-white/6"
      } ${current ? "ring-2 ring-yellow-300/80 ring-offset-2 ring-offset-transparent" : ""} ${
        isBoss ? "rounded-[24px]" : ""
      }`}
      style={{
        left,
        top,
        width: size,
        height: size,
      }}
    >
      <div className="flex h-full w-full items-center justify-center">
        <Icon className={`${isBoss ? "h-6 w-6" : "h-4 w-4"} ${style.text}`} />
      </div>
    </button>
  );
}

export default function RunMapOverlay({
  runMap,
  currentDepth,
  threatTier,
  onSelectNode,
  localPlayerName = null,
  localPlayerCharacterType = null,
}: RunMapOverlayProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [viewportSize, setViewportSize] = useState(DEFAULT_VIEWPORT_SIZE);
  const panAnchorRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const graphViewportRef = useRef<HTMLDivElement | null>(null);
  const nodesById = useMemo(
    () => new Map(runMap.nodes.map((node) => [node.id, node])),
    [runMap.nodes],
  );
  const reachableNodeIds = new Set(runMap.reachableNodeIds);
  const visitedNodeIds = new Set(runMap.visitedNodeIds);
  const reachableRouteIds = new Set(
    runMap.nodes
      .filter((node) => reachableNodeIds.has(node.id))
      .map((node) => node.routeId),
  );
  const currentNode = runMap.currentNodeId
    ? nodesById.get(runMap.currentNodeId) || null
    : null;
  const hoveredNode = hoveredNodeId
    ? nodesById.get(hoveredNodeId) || null
    : null;
  const highlightedNode =
    hoveredNode ||
    currentNode ||
    runMap.nodes.find((node) => reachableNodeIds.has(node.id)) ||
    runMap.nodes[0] ||
    null;
  const activeLegendType = hoveredNode?.encounterType || null;
  const emphasizedRouteId = currentNode?.routeId || null;
  const maxDepth = runMap.nodes.reduce(
    (max, node) => Math.max(max, node.depth),
    0,
  );
  const bossChoices = getBossChoices(runMap.nodes);
  const routeBossById = new Map(
    bossChoices.map((node) => [node.routeId, node]),
  );
  const bossSummary = bossChoices
    .map((bossNode) => {
      const routeMeta = ROUTE_META[bossNode.routeId];
      return `${routeMeta.tag}: ${
        bossNode.bossType ? formatBossType(bossNode.bossType) : bossNode.title
      }`;
    })
    .join("   |   ");
  const highlightedRouteMeta = highlightedNode
    ? ROUTE_META[highlightedNode.routeId]
    : null;
  const highlightedBoss = highlightedNode
    ? routeBossById.get(highlightedNode.routeId) || null
    : null;
  const character = localPlayerCharacterType
    ? getCharacter(localPlayerCharacterType)
    : null;

  useEffect(() => {
    if (hoveredNodeId && !nodesById.has(hoveredNodeId)) {
      setHoveredNodeId(null);
    }
  }, [hoveredNodeId, nodesById]);

  useEffect(() => {
    const viewport = graphViewportRef.current;
    if (!viewport) return;
    const updateViewportSize = () => {
      setViewportSize({
        width: viewport.clientWidth || DEFAULT_VIEWPORT_SIZE.width,
        height: viewport.clientHeight || DEFAULT_VIEWPORT_SIZE.height,
      });
    };
    updateViewportSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateViewportSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setZoom(0.9);
    setPan({ x: 0, y: 0 });
  }, [runMap.floorIndex, runMap.nodes.length]);

  const minX = Math.min(...runMap.nodes.map((node) => node.x));
  const maxX = Math.max(...runMap.nodes.map((node) => node.x));
  const minY = Math.min(...runMap.nodes.map((node) => node.y));
  const maxY = Math.max(...runMap.nodes.map((node) => node.y));
  const worldCenterX = (minX + maxX) / 2;
  const worldCenterY = (minY + maxY) / 2;
  const worldWidth = Math.max(1, maxX - minX);
  const worldHeight = Math.max(1, maxY - minY);
  const usableWidth = Math.max(
    320,
    viewportSize.width - MAP_LAYOUT_PADDING.left - MAP_LAYOUT_PADDING.right,
  );
  const usableHeight = Math.max(
    280,
    viewportSize.height - MAP_LAYOUT_PADDING.top - MAP_LAYOUT_PADDING.bottom,
  );
  const graphCenter = {
    x: MAP_LAYOUT_PADDING.left + usableWidth / 2,
    y: MAP_LAYOUT_PADDING.top + usableHeight / 2,
  };
  const fitScale = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);
  const graphScale = fitScale * BASE_SCALE_OVERSHOOT;
  const normalizePoint = (x: number, y: number) => ({
    x: graphCenter.x + (x - worldCenterX) * graphScale,
    y: graphCenter.y + (y - worldCenterY) * graphScale,
  });

  const nodeScreenPositions = useMemo(() => {
    const minBoundX = MAP_LAYOUT_PADDING.left + 20;
    const maxBoundX = MAP_LAYOUT_PADDING.left + usableWidth - 20;
    const minBoundY = MAP_LAYOUT_PADDING.top + 20;
    const maxBoundY = MAP_LAYOUT_PADDING.top + usableHeight - 20;
    const points = runMap.nodes.map((node) => {
      const anchor = normalizePoint(node.x, node.y);
      return {
        id: node.id,
        type: node.encounterType,
        x: anchor.x,
        y: anchor.y,
        anchorX: anchor.x,
        anchorY: anchor.y,
        radius: node.encounterType === "boss" ? 30 : 21,
      };
    });

    for (let iteration = 0; iteration < 70; iteration++) {
      for (const point of points) {
        point.x += (point.anchorX - point.x) * 0.08;
        point.y += (point.anchorY - point.y) * 0.08;
      }

      for (const point of points) {
        const corePadding = point.type === "boss" ? 20 : 12;
        const minCoreDistance = 88 + point.radius + corePadding;
        const deltaX = point.x - graphCenter.x;
        const deltaY = point.y - graphCenter.y;
        const distance = Math.hypot(deltaX, deltaY) || 0.001;
        if (distance < minCoreDistance) {
          const push = minCoreDistance - distance;
          point.x += (deltaX / distance) * push;
          point.y += (deltaY / distance) * push;
        }
      }

      for (let index = 0; index < points.length; index++) {
        const source = points[index];
        for (let targetIndex = index + 1; targetIndex < points.length; targetIndex++) {
          const target = points[targetIndex];
          const deltaX = target.x - source.x;
          const deltaY = target.y - source.y;
          const distance = Math.hypot(deltaX, deltaY) || 0.001;
          const minDistance = source.radius + target.radius + 8;
          if (distance >= minDistance) continue;
          const push = ((minDistance - distance) / 2) * 0.95;
          const normX = deltaX / distance;
          const normY = deltaY / distance;
          source.x -= normX * push;
          source.y -= normY * push;
          target.x += normX * push;
          target.y += normY * push;
        }
      }

      for (const point of points) {
        point.x = clampValue(point.x, minBoundX, maxBoundX);
        point.y = clampValue(point.y, minBoundY, maxBoundY);
      }
    }

    return new Map(points.map((point) => [point.id, { x: point.x, y: point.y }]));
  }, [
    graphCenter.x,
    graphCenter.y,
    runMap.nodes,
    usableHeight,
    usableWidth,
    worldCenterX,
    worldCenterY,
    graphScale,
  ]);
  const entryNodes = runMap.nodes.filter((node) => node.depth === 1);
  const edgeSegments = [
    ...entryNodes.map((node) => ({
      id: `core-${node.id}`,
      routeId: node.routeId,
      source: graphCenter,
      target: nodeScreenPositions.get(node.id) || graphCenter,
    })),
    ...runMap.nodes.flatMap((node) =>
      node.nextNodeIds
        .map((nextNodeId) => {
          const targetNode = nodesById.get(nextNodeId);
          if (!targetNode) return null;
          return {
            id: `${node.id}-${targetNode.id}`,
            routeId: node.routeId,
            source: nodeScreenPositions.get(node.id) || graphCenter,
            target: nodeScreenPositions.get(targetNode.id) || graphCenter,
          };
        })
        .filter(
          (
            edge,
          ): edge is {
            id: string;
            routeId: RunMapRouteId;
            source: { x: number; y: number };
            target: { x: number; y: number };
          } => edge !== null,
        ),
    ),
  ];

  const handleZoomChange = (nextZoom: number, cursorX?: number, cursorY?: number) => {
    const clamped = clampValue(nextZoom, 0.32, 3.2);
    if (cursorX === undefined || cursorY === undefined) {
      setZoom(clamped);
      return;
    }

    const worldX = (cursorX - pan.x) / zoom;
    const worldY = (cursorY - pan.y) / zoom;
    setZoom(clamped);
    setPan({
      x: cursorX - worldX * clamped,
      y: cursorY - worldY * clamped,
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = graphViewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    handleZoomChange(zoom * factor, cursorX, cursorY);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button[data-map-node-id]")) return;
    setIsPanning(true);
    panAnchorRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: pan.x,
      startY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !panAnchorRef.current) return;
    const deltaX = event.clientX - panAnchorRef.current.pointerX;
    const deltaY = event.clientY - panAnchorRef.current.pointerY;
    setPan({
      x: panAnchorRef.current.startX + deltaX,
      y: panAnchorRef.current.startY + deltaY,
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsPanning(false);
    panAnchorRef.current = null;
  };

  return (
    <motion.div
      className="absolute inset-0 z-[70] overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.12),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.76),rgba(2,6,23,0.92))] backdrop-blur-[2px]"
      initial={{ opacity: 0, scale: 1.03, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.985, filter: "blur(10px)" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <motion.div
        className="absolute -left-16 top-14 h-72 w-72 rounded-full bg-cyan-400/6 blur-3xl"
        animate={{ x: [0, 22, 0], y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-10 top-20 h-80 w-80 rounded-full bg-fuchsia-500/8 blur-3xl"
        animate={{ x: [0, -26, 0], y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(56,189,248,0.04)_100%),linear-gradient(90deg,transparent_96%,rgba(217,70,239,0.04)_100%)] bg-[size:100%_24px,24px_100%] opacity-35" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(6,11,24,0.96),rgba(6,11,24,0.4),transparent)]" />

      <motion.div
        className="absolute left-6 top-6 right-6 z-[2] flex items-start justify-between gap-6"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.28, delay: 0.04 }}
      >
        <div className="max-w-[58%]">
          <div className="font-press-start text-[18px] text-white">
            SYSTEM ROUTE MAP
          </div>
          <div className="mt-2 font-vt323 text-[22px] uppercase tracking-[0.24em] text-cyan-200/90">
            Choose a boss arm
          </div>
          <div className="mt-2 font-vt323 text-[18px] text-white/60">
            Commit from the core, fork inside the route, then break the boss at
            the edge.
          </div>
          {bossSummary && (
            <div className="mt-2 font-vt323 text-[18px] text-fuchsia-100/75">
              {bossSummary}
            </div>
          )}
          <div className="mt-2 font-vt323 text-[18px] text-cyan-100/55">
            Every arm is visible from the start. Hover any node to inspect its
            entire route.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-xl border border-cyan-400/35 bg-black/45 px-4 py-3">
            <div className="font-press-start text-[10px] text-cyan-300/80">
              RING
            </div>
            <div className="mt-2 font-press-start text-[18px] text-white">
              {currentDepth}/{maxDepth}
            </div>
          </div>
          <div className="rounded-xl border border-fuchsia-400/35 bg-black/45 px-4 py-3">
            <div className="font-press-start text-[10px] text-fuchsia-300/80">
              THREAT
            </div>
            <div className="mt-2 font-press-start text-[18px] text-white">
              {Math.max(0, threatTier)}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-6 bottom-6 top-28 overflow-hidden rounded-[28px] border border-cyan-400/20 bg-black/34 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.05),0_0_40px_rgba(0,0,0,0.25)]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.32, delay: 0.08 }}
      >
        <div
          ref={graphViewportRef}
          className={`absolute inset-0 z-[1] touch-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              className="absolute inset-0 z-[1]"
              width="100%"
              height="100%"
            >
              {edgeSegments.map((edge) => {
                const routeMeta = ROUTE_META[edge.routeId];
                const isEmphasized = emphasizedRouteId === edge.routeId;
                const isReachableRoute = reachableRouteIds.has(edge.routeId);
                const isCurrentRoute = currentNode?.routeId === edge.routeId;
                const active = isEmphasized || isCurrentRoute;
                const path = buildCurvePath(edge.source, edge.target, graphCenter);

                return (
                  <g key={edge.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke={active ? routeMeta.glow : "rgba(90,130,160,0.08)"}
                      strokeWidth={active ? 10 : isReachableRoute ? 6 : 4}
                      strokeLinecap="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        active
                          ? routeMeta.stroke
                          : isReachableRoute
                            ? "rgba(142,245,255,0.72)"
                            : "rgba(106,154,194,0.42)"
                      }
                      strokeWidth={active ? 2.7 : isReachableRoute ? 2.1 : 1.5}
                      strokeLinecap="round"
                      strokeDasharray={active ? "2 8" : "1 10"}
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-0 z-[2]">
              <motion.div
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 bg-black/70 p-3 text-center ${highlightedRouteMeta?.coreGlow || "shadow-[0_0_28px_rgba(34,211,238,0.12)]"}`}
                style={{
                  left: graphCenter.x,
                  top: graphCenter.y,
                  width: 170,
                  height: 170,
                }}
                animate={{
                  boxShadow:
                    emphasizedRouteId && highlightedRouteMeta
                      ? `0 0 42px ${ROUTE_META[emphasizedRouteId].glow}`
                      : "0 0 28px rgba(34,211,238,0.12)",
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex h-full flex-col items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_60%)]">
                  <div className="text-[30px] leading-none">
                    {character?.emoji || "O"}
                  </div>
                  <div className="mt-3 font-press-start text-[10px] tracking-[0.16em] text-white/70">
                    RUN CORE
                  </div>
                  <div className="mt-2 font-vt323 text-[20px] leading-none text-white">
                    {localPlayerName || character?.name || "Operator"}
                  </div>
                  <div className="mt-2 font-vt323 text-[16px] text-white/48">
                    Select an outward route
                  </div>
                </div>
              </motion.div>

              {runMap.nodes.map((node) => {
                const point = nodeScreenPositions.get(node.id) || graphCenter;
                return renderMapNodeButton({
                  runNode: node,
                  selectable: reachableNodeIds.has(node.id),
                  visited: visitedNodeIds.has(node.id),
                  current: currentNode?.id === node.id,
                  left: point.x,
                  top: point.y,
                  onSelectNode,
                  onHoverNode: setHoveredNodeId,
                });
              })}
            </div>
          </div>
        </div>

        <div className="absolute right-5 top-5 z-[3] w-[250px] rounded-[24px] border border-cyan-400/22 bg-black/55 p-4 shadow-[0_0_24px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          {highlightedNode ? (
            <>
              <div className="font-press-start text-[11px] text-cyan-200/80">
                {getNodeStyle(highlightedNode).label}
              </div>
              <div className="mt-3 font-vt323 text-[28px] leading-none text-white">
                {highlightedNode.bossType
                  ? formatBossType(highlightedNode.bossType)
                  : highlightedNode.title || getNodeStyle(highlightedNode).label}
              </div>
              <div className="mt-2 font-vt323 text-[18px] text-white/55">
                {ROUTE_META[highlightedNode.routeId].tag}
                {reachableNodeIds.has(highlightedNode.id)
                  ? "  |  Reachable"
                  : visitedNodeIds.has(highlightedNode.id)
                    ? "  |  Cleared"
                    : ""}
              </div>
              <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="font-press-start text-[10px] text-white/42">
                  ROUTE
                </div>
                <div className="mt-2 font-vt323 text-[22px] leading-none text-white">
                  {ROUTE_META[highlightedNode.routeId].label}
                </div>
                {highlightedBoss?.bossType && (
                  <div className="mt-2 font-vt323 text-[18px] text-fuchsia-100/70">
                    Boss target: {formatBossType(highlightedBoss.bossType)}
                  </div>
                )}
              </div>
              {(highlightedNode.rewards || []).length > 0 && (
                <div className="mt-4">
                  <div className="font-press-start text-[10px] text-white/48">
                    REWARDS
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(highlightedNode.rewards || []).map((reward) =>
                      renderRewardChip(reward),
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="font-vt323 text-[22px] text-white/60">
              Hover a node to inspect its route info.
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="font-press-start text-[10px] text-white/48">
              LEGEND
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {(
                [
                  { type: "combat", label: "Combat" },
                  { type: "hellhound", label: "Hellhound" },
                  { type: "shop", label: "Shop" },
                  { type: "boss", label: "Boss" },
                ] as const
              ).map(({ type, label }) => {
                const style = ENCOUNTER_STYLES[type];
                const Icon = style.Icon;
                return (
                  <motion.div
                    key={type}
                    animate={
                      activeLegendType === type
                        ? {
                            scale: [1, 1.04, 1],
                            boxShadow: [
                              "0 0 0 rgba(0,0,0,0)",
                              "0 0 18px rgba(255,255,255,0.14)",
                              "0 0 0 rgba(0,0,0,0)",
                            ],
                            borderColor: "rgba(255,255,255,0.45)",
                          }
                        : {
                            scale: 1,
                            boxShadow: "0 0 0 rgba(0,0,0,0)",
                            borderColor: "rgba(255,255,255,0.12)",
                          }
                    }
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 ${style.chip}`}
                  >
                    <Icon className={`h-4 w-4 ${style.text}`} />
                    <span className="font-vt323 text-[18px] text-white/82">
                      {label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-5 left-5 z-[3] flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, delay: 0.12 }}
        >
          <div className="rounded-full border border-white/12 bg-black/40 px-4 py-2 font-vt323 text-[18px] text-white/62">
            Inspect every node. Reachable nodes are the only selectable sockets.
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/28 bg-black/45 px-3 py-2">
            <button
              type="button"
              onClick={() => handleZoomChange(zoom * 0.88)}
              className="h-7 w-7 rounded-full border border-white/20 bg-white/5 font-press-start text-[12px] text-white/80 hover:border-white/45 hover:bg-white/12"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="rounded-full border border-white/18 bg-white/5 px-3 py-1 font-press-start text-[9px] text-white/70 hover:border-white/45 hover:bg-white/12"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoomChange(zoom * 1.14)}
              className="h-7 w-7 rounded-full border border-white/20 bg-white/5 font-press-start text-[12px] text-white/80 hover:border-white/45 hover:bg-white/12"
            >
              +
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
