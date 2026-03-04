import {
  BaseEdge,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { Crown, Crosshair, PawPrint, ShoppingBag } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import type {
  BossType,
  RunMapEncounterType,
  RunMapNode,
  RunMapReward,
  RunMapState,
} from "@shared/types";

interface RunMapOverlayProps {
  runMap: RunMapState;
  currentDepth: number;
  threatTier: number;
  onSelectNode: (nodeId: string) => void;
}

type MapEdgeData = {
  active: boolean;
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
    glow: "shadow-[0_0_26px_rgba(34,211,238,0.22)]",
    text: "text-cyan-200",
    chip: "border-cyan-400/45 bg-cyan-500/10 text-cyan-100",
  },
  hellhound: {
    Icon: PawPrint,
    label: "HELLHOUND",
    ring: "border-red-400/80 bg-red-500/12",
    glow: "shadow-[0_0_28px_rgba(248,113,113,0.24)]",
    text: "text-red-200",
    chip: "border-red-400/45 bg-red-500/10 text-red-100",
  },
  shop: {
    Icon: ShoppingBag,
    label: "SHOP",
    ring: "border-yellow-300/80 bg-yellow-400/12",
    glow: "shadow-[0_0_28px_rgba(250,204,21,0.24)]",
    text: "text-yellow-100",
    chip: "border-yellow-300/40 bg-yellow-400/10 text-yellow-100",
  },
  boss: {
    Icon: Crown,
    label: "BOSS",
    ring: "border-fuchsia-400/85 bg-fuchsia-500/14",
    glow: "shadow-[0_0_30px_rgba(217,70,239,0.28)]",
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
  shopDiscount: { chip: "border-yellow-300/45 bg-yellow-400/14 text-yellow-100" },
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
    .sort((a, b) => a.y - b.y);
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

function renderMapNodeButton({
  runNode,
  selectable,
  visited,
  current,
  onSelectNode,
  onHoverNode,
  left,
  top,
}: {
  runNode: RunMapNode;
  selectable: boolean;
  visited: boolean;
  current: boolean;
  onSelectNode: (nodeId: string) => void;
  onHoverNode: (nodeId: string | null) => void;
  left: number;
  top: number;
}) {
  const style = getNodeStyle(runNode);
  const isBoss = runNode.encounterType === "boss";
  const Icon = style.Icon;
  const size = isBoss ? 86 : 74;

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
      data-map-node-id={runNode.id}
      data-map-node-depth={runNode.depth}
      data-map-node-type={runNode.encounterType}
      data-map-node-selectable={selectable ? "true" : "false"}
      data-map-node-rewards={(runNode.rewards || []).map((reward) => reward.type).join(",")}
      onMouseEnter={() => onHoverNode(runNode.id)}
      onMouseLeave={() => onHoverNode(null)}
      onFocus={() => onHoverNode(runNode.id)}
      onBlur={() => onHoverNode(null)}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200 ${
        style.ring
      } ${style.glow} ${
        selectable
          ? "cursor-pointer hover:scale-[1.05] hover:border-white/80 hover:bg-white/10"
          : visited
            ? "cursor-help opacity-95 hover:scale-[1.03] hover:border-white/45 hover:bg-white/6"
            : "cursor-help opacity-70 hover:scale-[1.03] hover:border-white/45 hover:bg-white/6"
      } ${current ? "ring-2 ring-yellow-300/80 ring-offset-2 ring-offset-transparent" : ""} ${
        isBoss ? "rounded-[26px]" : ""
      }`}
      style={{
        left,
        top,
        width: size,
        height: size,
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center">
        <Icon className={`h-7 w-7 ${style.text}`} strokeWidth={2.1} />
        <div className="mt-2 font-press-start text-[9px] tracking-[0.18em] text-white/72">
          {isBoss ? "BOSS" : `D${runNode.depth}`}
        </div>
      </div>
    </button>
  );
}

function MapRouteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<Edge<MapEdgeData>>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 22,
    offset: 18,
  });
  const active = !!data?.active;

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={active ? "rgba(140,245,255,0.14)" : "rgba(90,130,160,0.08)"}
        strokeWidth={active ? 4 : 2.5}
        strokeLinecap="round"
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: active ? "rgba(142,245,255,0.88)" : "rgba(106,154,194,0.5)",
          strokeWidth: active ? 2.1 : 1.6,
          strokeLinecap: "round",
          strokeDasharray: active ? "1 8" : "1 10",
        }}
      />
    </>
  );
}

const edgeTypes = {
  routeEdge: MapRouteEdge,
};

export default function RunMapOverlay({
  runMap,
  currentDepth,
  threatTier,
  onSelectNode,
}: RunMapOverlayProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const nodesById = new Map(runMap.nodes.map((node) => [node.id, node]));
  const reachableNodeIds = new Set(runMap.reachableNodeIds);
  const visitedNodeIds = new Set(runMap.visitedNodeIds);
  const currentNode = runMap.currentNodeId
    ? nodesById.get(runMap.currentNodeId) || null
    : null;
  const hoveredNode = hoveredNodeId ? nodesById.get(hoveredNodeId) || null : null;
  const maxDepth = runMap.nodes.reduce((max, node) => Math.max(max, node.depth), 0);
  const bossChoices = getBossChoices(runMap.nodes);
  const bossSummary = bossChoices
    .map((bossNode, index) =>
      `${index === 0 ? "Upper" : "Lower"} boss: ${
        bossNode.bossType ? formatBossType(bossNode.bossType) : bossNode.title
      }`,
    )
    .join("   |   ");
  const highlightedNode =
    hoveredNode ||
    currentNode ||
    runMap.nodes.find((node) => reachableNodeIds.has(node.id)) ||
    runMap.nodes[0] ||
    null;
  const activeLegendType = hoveredNode?.encounterType || null;

  useEffect(() => {
    if (hoveredNodeId && !nodesById.has(hoveredNodeId)) {
      setHoveredNodeId(null);
    }
  }, [hoveredNodeId, nodesById]);

  const nodeXValues = runMap.nodes.map((node) => node.x);
  const nodeYValues = runMap.nodes.map((node) => node.y);
  const minX = Math.min(...nodeXValues);
  const maxX = Math.max(...nodeXValues);
  const minY = Math.min(...nodeYValues);
  const maxY = Math.max(...nodeYValues);
  const graphLeftInset = 210;
  const graphWidth = 980;
  const normalizeX = (value: number) => {
    if (maxX === minX) return graphLeftInset + graphWidth / 2;
    return graphLeftInset + ((value - minX) / (maxX - minX)) * graphWidth;
  };
  const normalizeY = (value: number) => {
    if (maxY === minY) return 290;
    return 110 + ((value - minY) / (maxY - minY)) * 430;
  };

  const flowNodes: Node[] = runMap.nodes.map((node) => ({
    id: node.id,
    position: {
      x: normalizeX(node.x),
      y: normalizeY(node.y),
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
    selectable: false,
    style: {
      width: 1,
      height: 1,
      opacity: 0,
      pointerEvents: "none",
      background: "transparent",
      border: "none",
    },
  }));

  const flowEdges: Edge<MapEdgeData>[] = runMap.nodes.flatMap((node) =>
    node.nextNodeIds
      .map((nextNodeId) => {
        const nextNode = nodesById.get(nextNodeId);
        if (!nextNode) return null;

        const isRouteActive =
          reachableNodeIds.has(nextNode.id) ||
          (currentNode?.id === node.id && nextNode.depth === node.depth + 1);

        return {
          id: `${node.id}-${nextNode.id}`,
          source: node.id,
          target: nextNode.id,
          type: "routeEdge",
          selectable: false,
          data: {
            active: isRouteActive,
          },
        } satisfies Edge<MapEdgeData>;
      })
      .filter((edge): edge is Edge<MapEdgeData> => edge !== null),
  );

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
        <div className="max-w-[54%]">
          <div className="font-press-start text-[18px] text-white">SYSTEM ROUTE MAP</div>
          <div className="mt-2 font-vt323 text-[22px] uppercase tracking-[0.24em] text-cyan-200/90">
            Choose the next node
          </div>
          <div className="mt-2 font-vt323 text-[18px] text-white/60">
            Commit early, merge for pressure or recovery, then route into the boss you want.
          </div>
          {bossSummary && (
            <div className="mt-2 font-vt323 text-[18px] text-fuchsia-100/75">
              {bossSummary}
            </div>
          )}
          <div className="mt-2 font-vt323 text-[18px] text-cyan-100/55">
            Floor rolls, reward tags, and boss prep sequences are seeded per run.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="rounded-xl border border-cyan-400/35 bg-black/45 px-4 py-3">
            <div className="font-press-start text-[10px] text-cyan-300/80">NODE</div>
            <div className="mt-2 font-press-start text-[18px] text-white">
              {currentDepth}/{maxDepth}
            </div>
          </div>
          <div className="rounded-xl border border-fuchsia-400/35 bg-black/45 px-4 py-3">
            <div className="font-press-start text-[10px] text-fuchsia-300/80">THREAT</div>
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
        <div className="absolute inset-0 pr-[270px] [&_.react-flow]:bg-transparent [&_.react-flow__attribution]:hidden [&_.react-flow__edge-path]:transition-all [&_.react-flow__node]:pointer-events-none [&_.react-flow__nodes]:pointer-events-none [&_.react-flow__pane]:hidden [&_.react-flow__viewport]:pointer-events-none">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            edgeTypes={edgeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={1}
            maxZoom={1}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            zoomOnPinch={false}
            preventScrolling={false}
            edgesFocusable={false}
            nodesFocusable={false}
            proOptions={{ hideAttribution: true }}
          />
        </div>

        <div className="absolute inset-0 z-[2] pr-[270px]">
          {runMap.nodes.map((node) =>
            renderMapNodeButton({
              runNode: node,
              selectable: reachableNodeIds.has(node.id),
              visited: visitedNodeIds.has(node.id),
              current: currentNode?.id === node.id,
              onSelectNode,
              onHoverNode: setHoveredNodeId,
              left: normalizeX(node.x),
              top: normalizeY(node.y),
            }),
          )}
        </div>

        <div className="absolute right-5 top-5 z-[2] w-[250px] rounded-[24px] border border-cyan-400/22 bg-black/55 p-4 shadow-[0_0_24px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          {highlightedNode ? (
            <>
              <div className="font-press-start text-[11px] text-cyan-200/80">
                {getNodeStyle(highlightedNode).label}
              </div>
              <div className="mt-3 font-vt323 text-[28px] leading-none text-white">
                {highlightedNode.bossType
                  ? formatBossType(highlightedNode.bossType)
                  : highlightedNode.title || `Depth ${highlightedNode.depth}`}
              </div>
              <div className="mt-2 font-vt323 text-[18px] text-white/55">
                Depth {highlightedNode.depth}
                {reachableNodeIds.has(highlightedNode.id)
                  ? "  |  Reachable"
                  : visitedNodeIds.has(highlightedNode.id)
                    ? "  |  Cleared"
                    : ""}
              </div>
              {(highlightedNode.rewards || []).length > 0 && (
                <div className="mt-4">
                  <div className="font-press-start text-[10px] text-white/48">REWARDS</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(highlightedNode.rewards || []).map((reward) => renderRewardChip(reward))}
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
            <div className="font-press-start text-[10px] text-white/48">LEGEND</div>
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
                    <Icon className={`h-4 w-4 ${style.text}`} strokeWidth={2.1} />
                    <span className="font-vt323 text-[18px] text-white/82">{label}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <motion.div
          className="absolute bottom-5 left-5 z-[2] flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, delay: 0.12 }}
        >
          <div className="rounded-full border border-white/12 bg-black/40 px-4 py-2 font-vt323 text-[18px] text-white/62">
            Hover nodes to inspect rewards and boss routes.
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
