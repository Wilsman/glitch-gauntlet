import { motion } from "framer-motion";
import { Crown, Crosshair, PawPrint, ShoppingBag } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
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
  _center: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const perpX = -dy / len;
  const perpY = dx / len;
  const lateralShift = (end.y - start.y) * 0.08 - (end.x - start.x) * 0.04;
  const mx = (start.x + end.x) / 2 + perpX * lateralShift;
  const my = (start.y + end.y) / 2 + perpY * lateralShift;
  return `M ${start.x} ${start.y} Q ${mx} ${my} ${end.x} ${end.y}`;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nodeHash(id: string, salt: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const MAP_LAYOUT_PADDING = {
  top: 48,
  right: 260,
  bottom: 48,
  left: 48,
};
const DEFAULT_VIEWPORT_SIZE = { width: 1280, height: 720 };
const HUB_DEPTHS = new Set([3, 6, 10, 14]);

function getNodeTier(node: RunMapNode): "keystone" | "notable" | "minor" {
  if (node.encounterType === "boss") return "keystone";
  if (HUB_DEPTHS.has(node.depth)) return "notable";
  return "minor";
}

const NODE_TIER_SIZES: Record<"keystone" | "notable" | "minor", number> = {
  keystone: 62,
  notable: 38,
  minor: 24,
};

const ROUTE_COLORS: Record<RunMapRouteId, string> = {
  north: "#facc15",
  east: "#22d3ee",
  south: "#34d399",
  west: "#f87171",
};

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
  const tier = getNodeTier(runNode);
  const size = NODE_TIER_SIZES[tier];
  const routeColor = ROUTE_COLORS[runNode.routeId];
  const isKeystone = tier === "keystone";
  const isNotable = tier === "notable";

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
      className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
        selectable
          ? "cursor-pointer hover:scale-110"
          : "cursor-help hover:scale-105"
      } ${selectable ? "animate-[mapNodePulse_2s_ease-in-out_infinite]" : ""}`}
      style={{
        left,
        top,
        width: size,
        height: size,
      }}
    >
      {/* Outer glow aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: isKeystone ? -14 : isNotable ? -10 : -7,
          background: `radial-gradient(circle, ${routeColor}${selectable ? "40" : visited ? "18" : "0c"}, transparent 70%)`,
          filter: selectable ? `blur(${isKeystone ? 6 : 4}px)` : "blur(3px)",
        }}
      />
      {/* Outer ring for notable/keystone */}
      {(isKeystone || isNotable) && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -3,
            border: `1.5px solid ${routeColor}${selectable ? "70" : visited ? "40" : "20"}`,
            borderRadius: "9999px",
          }}
        />
      )}
      {/* Main body */}
      <div
        className={`relative h-full w-full rounded-full border ${
          current ? "ring-2 ring-offset-1 ring-offset-transparent" : ""
        }`}
        style={{
          borderColor: `${routeColor}${selectable ? "b0" : visited ? "60" : "30"}`,
          background: `radial-gradient(circle at 40% 35%, ${routeColor}${selectable ? "20" : visited ? "10" : "08"}, rgba(0,0,0,0.7) 80%)`,
          boxShadow: selectable
            ? `0 0 ${isKeystone ? 24 : 14}px ${routeColor}40, inset 0 0 ${isKeystone ? 12 : 8}px ${routeColor}15`
            : visited
              ? `0 0 8px ${routeColor}18`
              : "none",
          opacity: selectable ? 1 : visited ? 0.85 : 0.55,
        }}
      >
        {/* Inner highlight for minor */}
        {!isKeystone && !isNotable && (
          <div
            className="absolute inset-[3px] rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle at 45% 40%, ${routeColor}30, transparent 65%)`,
            }}
          />
        )}
        {/* Diamond inset for keystone */}
        {isKeystone && (
          <div
            className="absolute inset-[5px] rounded-full pointer-events-none border"
            style={{
              borderColor: `${routeColor}35`,
              background: `radial-gradient(circle at 50% 35%, ${routeColor}18, transparent 60%)`,
            }}
          />
        )}
        <div className="flex h-full w-full items-center justify-center relative z-10">
          <span
            style={{
              filter: selectable
                ? `drop-shadow(0 0 4px ${routeColor}80)`
                : "none",
            }}
          >
            <Icon
              className={`${
                isKeystone
                  ? "h-7 w-7"
                  : isNotable
                    ? "h-[18px] w-[18px]"
                    : "h-3 w-3"
              } ${style.text}`}
            />
          </span>
        </div>
      </div>
      {/* Visited indicator dot */}
      {visited && !current && (
        <div
          className="absolute -top-1 -right-1 h-3 w-3 rounded-full border flex items-center justify-center pointer-events-none z-20"
          style={{
            borderColor: `${routeColor}80`,
            background: `${routeColor}30`,
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: routeColor }}
          />
        </div>
      )}
    </button>
  );
}

function getGraphBounds(
  nodePositions: Map<string, { x: number; y: number }>,
  nodes: RunMapNode[],
  center: { x: number; y: number },
) {
  const points = nodes
    .map((node) => nodePositions.get(node.id))
    .filter((point): point is { x: number; y: number } => Boolean(point));
  points.push(center);

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  return { minX, maxX, minY, maxY };
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
  const activeLegendType = highlightedNode?.encounterType || null;
  const emphasizedRouteId = highlightedNode?.routeId || currentNode?.routeId || null;
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

  const usableWidth = Math.max(
    320,
    viewportSize.width - MAP_LAYOUT_PADDING.left - MAP_LAYOUT_PADDING.right,
  );
  const usableHeight = Math.max(
    280,
    viewportSize.height - MAP_LAYOUT_PADDING.top - MAP_LAYOUT_PADDING.bottom,
  );
  const graphCenter = useMemo(
    () => ({
      x: MAP_LAYOUT_PADDING.left + usableWidth / 2,
      y: MAP_LAYOUT_PADDING.top + usableHeight / 2,
    }),
    [usableWidth, usableHeight],
  );
  const nodeScreenPositions = useMemo(() => {
    const ROUTE_BASE_ANGLES: Record<RunMapRouteId, number> = {
      north: -Math.PI / 2,
      east: 0,
      south: Math.PI / 2,
      west: Math.PI,
    };

    const localMaxDepth = runMap.nodes.reduce(
      (m, n) => Math.max(m, n.depth),
      0,
    );
    const LANE_COUNT = 5;
    const middleLane = (LANE_COUNT - 1) / 2;
    const minRing = 110;
    const fullReach = usableWidth / 2;
    const bossExtra = 50;
    const innerReach = fullReach - bossExtra;
    const depthStep =
      localMaxDepth > 1 ? (innerReach - minRing) / (localMaxDepth - 1) : 0;
    const laneSpacing = 54;

    const points = runMap.nodes.map((node) => {
      const baseAngle = ROUTE_BASE_ANGLES[node.routeId];
      const isBoss = node.encounterType === "boss";
      const ringRadius = isBoss ? fullReach : minRing + node.depth * depthStep;

      const radialX = Math.cos(baseAngle);
      const radialY = Math.sin(baseAngle);
      const tangentX = -radialY;
      const tangentY = radialX;

      const laneOffset = (node.lane - middleLane) * laneSpacing;

      const jitter = isBoss || node.depth <= 1 ? 0 : depthStep * 0.18;
      const radialJitter = (nodeHash(node.id, 1) - 0.5) * jitter;
      const tangentJitter = (nodeHash(node.id, 2) - 0.5) * laneSpacing * 0.25;

      const x =
        graphCenter.x +
        radialX * (ringRadius + radialJitter) +
        tangentX * (laneOffset + tangentJitter);
      const y =
        graphCenter.y +
        radialY * (ringRadius + radialJitter) +
        tangentY * (laneOffset + tangentJitter);

      return {
        id: node.id,
        type: node.encounterType,
        depth: node.depth,
        x,
        y,
        anchorX: x,
        anchorY: y,
        radius:
          node.encounterType === "boss"
            ? 36
            : HUB_DEPTHS.has(node.depth)
              ? 24
              : 16,
      };
    });

    // Light overlap resolution
    for (let iteration = 0; iteration < 30; iteration++) {
      for (const point of points) {
        point.x += (point.anchorX - point.x) * 0.2;
        point.y += (point.anchorY - point.y) * 0.2;
      }

      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          const minDist = a.radius + b.radius + 8;
          if (dist >= minDist) continue;
          const push = ((minDist - dist) / 2) * 0.8;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }

    return new Map(
      points.map((point) => [point.id, { x: point.x, y: point.y }]),
    );
  }, [graphCenter.x, graphCenter.y, runMap.nodes, usableHeight, usableWidth]);

  const depthRings = useMemo(() => {
    const depthRadii = new Map<number, number[]>();
    runMap.nodes.forEach((node) => {
      const pos = nodeScreenPositions.get(node.id);
      if (!pos) return;
      const r = Math.hypot(pos.x - graphCenter.x, pos.y - graphCenter.y);
      if (!depthRadii.has(node.depth)) depthRadii.set(node.depth, []);
      depthRadii.get(node.depth)!.push(r);
    });
    return Array.from(depthRadii.entries())
      .map(([depth, radii]) => ({
        depth,
        radius: radii.reduce((a, b) => a + b, 0) / radii.length,
      }))
      .sort((a, b) => a.depth - b.depth);
  }, [runMap.nodes, nodeScreenPositions, graphCenter.x, graphCenter.y]);

  const graphBounds = useMemo(
    () => getGraphBounds(nodeScreenPositions, runMap.nodes, graphCenter),
    [nodeScreenPositions, runMap.nodes, graphCenter.x, graphCenter.y],
  );

  const defaultTransform = useMemo(() => {
    const horizontalPadding = 120;
    const verticalPadding = 120;
    const availableWidth = Math.max(420, usableWidth - horizontalPadding);
    const availableHeight = Math.max(320, usableHeight - verticalPadding);
    const graphWidth = Math.max(320, graphBounds.maxX - graphBounds.minX);
    const graphHeight = Math.max(260, graphBounds.maxY - graphBounds.minY);
    const fitZoom = clampValue(
      Math.min(availableWidth / graphWidth, availableHeight / graphHeight),
      0.72,
      1.58,
    );

    const targetCenterX = MAP_LAYOUT_PADDING.left + availableWidth / 2 + 26;
    const targetCenterY = MAP_LAYOUT_PADDING.top + availableHeight / 2;
    const graphMidX = (graphBounds.minX + graphBounds.maxX) / 2;
    const graphMidY = (graphBounds.minY + graphBounds.maxY) / 2;

    return {
      zoom: fitZoom,
      pan: {
        x: targetCenterX - graphMidX * fitZoom,
        y: targetCenterY - graphMidY * fitZoom,
      },
    };
  }, [graphBounds.maxX, graphBounds.maxY, graphBounds.minX, graphBounds.minY, usableHeight, usableWidth]);

  useEffect(() => {
    setZoom(defaultTransform.zoom);
    setPan(defaultTransform.pan);
  }, [
    defaultTransform.zoom,
    defaultTransform.pan.x,
    defaultTransform.pan.y,
    runMap.floorIndex,
    runMap.nodes.length,
    viewportSize.height,
    viewportSize.width,
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

  const handleZoomChange = (
    nextZoom: number,
    cursorX?: number,
    cursorY?: number,
  ) => {
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

  const stopPanning = () => {
    setIsPanning(false);
    panAnchorRef.current = null;
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!panAnchorRef.current) return;
      const deltaX = event.clientX - panAnchorRef.current.pointerX;
      const deltaY = event.clientY - panAnchorRef.current.pointerY;
      setPan({
        x: panAnchorRef.current.startX + deltaX,
        y: panAnchorRef.current.startY + deltaY,
      });
    };

    const handleWindowMouseUp = () => {
      stopPanning();
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isPanning]);

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-pan-block='true']")) return;
    if (target.closest("button[data-map-node-id]")) return;
    event.preventDefault();
    setIsPanning(true);
    panAnchorRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: pan.x,
      startY: pan.y,
    };
  };

  return (
    <motion.div
      className="absolute inset-0 z-[70] overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(34,211,238,0.06),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.06),transparent_26%),linear-gradient(180deg,rgb(2,6,23),rgb(2,6,23))] backdrop-blur-sm"
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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[7%] h-[30vh] w-[30vh] -translate-x-1/2 rounded-full bg-yellow-300/6 blur-[100px]" />
        <div className="absolute right-[10%] top-1/2 h-[34vh] w-[34vh] -translate-y-1/2 rounded-full bg-cyan-300/5 blur-[110px]" />
        <div className="absolute bottom-[8%] left-1/2 h-[30vh] w-[30vh] -translate-x-1/2 rounded-full bg-emerald-300/5 blur-[110px]" />
        <div className="absolute left-[10%] top-1/2 h-[34vh] w-[34vh] -translate-y-1/2 rounded-full bg-rose-300/5 blur-[110px]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(56,189,248,0.03)_100%),linear-gradient(90deg,transparent_96%,rgba(217,70,239,0.03)_100%)] bg-[size:100%_24px,24px_100%] opacity-20" />

      <motion.div
        className="absolute left-6 top-6 right-6 z-[2] flex items-start justify-between gap-6"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.28, delay: 0.04 }}
      >
        <div className="max-w-[60%] rounded-[18px] border border-white/8 bg-black/28 px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 font-vt323 text-[13px] uppercase tracking-[0.28em] text-cyan-200/70">
              Route Map
            </div>
            <div className="font-vt323 text-[20px] tracking-[0.16em] text-cyan-300/45">
              Floor {currentDepth}/{maxDepth}
            </div>
          </div>
          <div className="mt-3 font-press-start text-[19px] tracking-[0.06em] text-white/92">
            Choose your next room.
          </div>
          <div className="mt-2 font-vt323 text-[18px] text-white/54">
            Pick one connected node. Your path locks in after each stop.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-[16px] border border-white/10 bg-black/28 px-4 py-3 text-right backdrop-blur-sm">
            <div className="font-press-start text-[8px] text-fuchsia-300/60">
              Current Threat
            </div>
            <div className="mt-1 font-vt323 text-[24px] leading-none text-white/88">
              {Math.max(0, threatTier)}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-6 bottom-6 top-20 overflow-hidden rounded-[24px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.35)]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.32, delay: 0.08 }}
        onMouseDown={handleMouseDown}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(11,21,48,0.5),rgba(2,6,23,0.88)_68%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-[252px] w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />
        <div
          ref={graphViewportRef}
          className={`absolute inset-x-0 bottom-0 top-0 z-[1] touch-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onWheel={handleWheel}
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
              style={{ width: "100%", height: "100%", overflow: "visible" }}
            >
              <defs>
                <filter
                  id="edgeGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="ringGlow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Concentric depth rings - POE2 web structure */}
              {depthRings.map(({ depth, radius }) => (
                <circle
                  key={`ring-${depth}`}
                  cx={graphCenter.x}
                  cy={graphCenter.y}
                  r={radius}
                  fill="none"
                  stroke={
                    HUB_DEPTHS.has(depth)
                      ? "rgba(142,245,255,0.09)"
                      : "rgba(100,140,180,0.035)"
                  }
                  strokeWidth={HUB_DEPTHS.has(depth) ? 1.2 : 0.6}
                  strokeDasharray={HUB_DEPTHS.has(depth) ? "4 8" : "2 14"}
                  filter={HUB_DEPTHS.has(depth) ? "url(#ringGlow)" : undefined}
                />
              ))}

              {/* Route sector guide lines from center */}
              {ROUTE_ORDER.map((routeId) => {
                const routeNodes = runMap.nodes.filter(
                  (n) => n.routeId === routeId && n.encounterType === "boss",
                );
                if (routeNodes.length === 0) return null;
                const bossPos = nodeScreenPositions.get(routeNodes[0].id);
                if (!bossPos) return null;
                return (
                  <line
                    key={`sector-${routeId}`}
                    x1={graphCenter.x}
                    y1={graphCenter.y}
                    x2={bossPos.x}
                    y2={bossPos.y}
                    stroke={`${ROUTE_COLORS[routeId]}08`}
                    strokeWidth={1}
                    strokeDasharray="6 18"
                  />
                );
              })}

              {/* Edge connections - 3-layer rendering */}
              {edgeSegments.map((edge) => {
                const routeColor = ROUTE_COLORS[edge.routeId];
                const isEmphasized = emphasizedRouteId === edge.routeId;
                const isReachableRoute = reachableRouteIds.has(edge.routeId);
                const isCurrentRoute = currentNode?.routeId === edge.routeId;
                const active = isEmphasized || isCurrentRoute;
                const path = buildCurvePath(
                  edge.source,
                  edge.target,
                  graphCenter,
                );

                return (
                  <g key={edge.id}>
                    {/* Wide glow halo */}
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        active
                          ? `${routeColor}28`
                          : isReachableRoute
                            ? "rgba(90,130,160,0.06)"
                            : "rgba(60,90,120,0.025)"
                      }
                      strokeWidth={active ? 14 : isReachableRoute ? 8 : 5}
                      strokeLinecap="round"
                      filter={active ? "url(#edgeGlow)" : undefined}
                    />
                    {/* Medium core stroke - dashed */}
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        active
                          ? `${routeColor}55`
                          : isReachableRoute
                            ? "rgba(142,245,255,0.22)"
                            : "rgba(106,154,194,0.10)"
                      }
                      strokeWidth={active ? 3 : isReachableRoute ? 2 : 1}
                      strokeLinecap="round"
                      strokeDasharray={
                        active ? "8 6" : isReachableRoute ? "6 8" : "4 10"
                      }
                    />
                    {/* Thin bright animated dash */}
                    <path
                      d={path}
                      fill="none"
                      stroke={
                        active
                          ? `${routeColor}cc`
                          : isReachableRoute
                            ? "rgba(142,245,255,0.50)"
                            : "rgba(106,154,194,0.25)"
                      }
                      strokeWidth={active ? 1.5 : isReachableRoute ? 1 : 0.5}
                      strokeLinecap="round"
                      strokeDasharray={active ? "3 9" : "2 14"}
                      className={
                        active ? "animate-[edgeFlow_2s_linear_infinite]" : ""
                      }
                    />
                  </g>
                );
              })}
            </svg>

            <div className="absolute inset-0 z-[2]">
              <motion.div
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 bg-black/72 p-3 text-center ${highlightedRouteMeta?.coreGlow || "shadow-[0_0_28px_rgba(34,211,238,0.12)]"}`}
                style={{
                  left: graphCenter.x,
                  top: graphCenter.y,
                  width: 162,
                  height: 162,
                }}
                animate={{
                  boxShadow:
                    emphasizedRouteId && highlightedRouteMeta
                      ? `0 0 42px ${ROUTE_META[emphasizedRouteId].glow}`
                      : "0 0 28px rgba(34,211,238,0.12)",
                }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <div className="relative flex h-full flex-col items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.1),transparent_60%)]">
                  <div className="absolute inset-[10px] rounded-full border border-cyan-300/10" />
                  <div className="text-[30px] leading-none">
                    {character?.emoji || "O"}
                  </div>
                  <div className="mt-2 font-press-start text-[9px] tracking-[0.18em] text-white/68">
                    RUN CORE
                  </div>
                  <div className="mt-2 font-vt323 text-[20px] leading-none text-white">
                    {localPlayerName || character?.name || "Operator"}
                  </div>
                  <div className="mt-1.5 font-vt323 text-[14px] uppercase tracking-[0.2em] text-white/42">
                    {highlightedRouteMeta?.tag || "CHOOSE"}
                  </div>
                  <div className="mt-1.5 font-vt323 text-[14px] text-white/48">
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

        <div data-pan-block="true" className="absolute right-5 top-5 z-[3] w-[244px] rounded-[22px] border border-white/[0.08] bg-black/62 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          {highlightedNode ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="font-press-start text-[11px] text-cyan-200/80">
                  {getNodeStyle(highlightedNode).label}
                </div>
                <div
                  className="rounded-full border px-2 py-1 font-vt323 text-xs uppercase tracking-[0.22em]"
                  style={{
                    borderColor: highlightedRouteMeta?.stroke || "rgba(255,255,255,0.18)",
                    color: highlightedRouteMeta?.stroke || "rgba(255,255,255,0.65)",
                  }}
                >
                  {ROUTE_META[highlightedNode.routeId].tag}
                </div>
              </div>
              <div className="mt-3 font-vt323 text-[30px] leading-none text-white">
                {highlightedNode.bossType
                  ? formatBossType(highlightedNode.bossType)
                  : highlightedNode.title ||
                    getNodeStyle(highlightedNode).label}
              </div>
              <div className="mt-2 font-vt323 text-[18px] text-white/55">
                {reachableNodeIds.has(highlightedNode.id)
                  ? "Reachable now"
                  : visitedNodeIds.has(highlightedNode.id)
                    ? "Already cleared"
                    : "Inspecting future signal"}
              </div>
              <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3">
                <div className="font-press-start text-[10px] text-white/42">
                  Path Info
                </div>
                <div className="mt-2 font-vt323 text-[22px] leading-none text-white">
                  {ROUTE_META[highlightedNode.routeId].label}
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((highlightedNode.depth + 1) / (maxDepth + 1)) * 100}%`,
                      background:
                        highlightedRouteMeta?.stroke || "rgba(255,255,255,0.3)",
                      boxShadow: highlightedRouteMeta
                        ? `0 0 16px ${highlightedRouteMeta.glow}`
                        : "none",
                    }}
                  />
                </div>
                {highlightedBoss?.bossType && (
                  <div className="mt-2 font-vt323 text-[18px] text-fuchsia-100/70">
                    Boss target: {formatBossType(highlightedBoss.bossType)}
                  </div>
                )}
              </div>
              <div className="mt-3 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="font-press-start text-[10px] text-white/42">
                  Room Status
                </div>
                <div className="mt-2 font-vt323 text-[18px] text-white/72">
                  Floor {highlightedNode.depth}
                  <span className="mx-2 text-white/22">|</span>
                  {reachableNodeIds.has(highlightedNode.id)
                    ? "Available"
                    : visitedNodeIds.has(highlightedNode.id)
                      ? "Cleared"
                      : "Locked for now"}
                </div>
              </div>
              {(highlightedNode.rewards || []).length > 0 && (
                <div className="mt-4">
                  <div className="font-press-start text-[10px] text-white/48">
                    Rewards
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
              Room Types
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
          data-pan-block="true"
          className="absolute bottom-5 left-5 z-[3] flex flex-wrap items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, delay: 0.12 }}
        >
          <div className="inline-flex items-center gap-2 rounded-[16px] border border-white/[0.08] bg-black/55 px-3 py-2">
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
                setZoom(defaultTransform.zoom);
                setPan(defaultTransform.pan);
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
          <div className="rounded-[16px] border border-white/[0.08] bg-black/45 px-4 py-3">
            <div className="font-press-start text-[9px] text-white/42">
              Controls
            </div>
            <div className="mt-1 font-vt323 text-[17px] text-white/58">
              Drag to pan. Wheel to zoom. Select a glowing room to continue.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
