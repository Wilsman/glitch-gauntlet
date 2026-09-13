import { motion } from "framer-motion";
import {
  CircleHelp,
  Coins,
  Crown,
  Crosshair,
  PawPrint,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { getCharacter } from "@shared/characterConfig";
import type {
  CharacterType,
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
  localPlayerName?: string | null;
  localPlayerCoins?: number;
  localPlayerCharacterType?: CharacterType | null;
}

type EncounterMeta = {
  Icon: LucideIcon;
  label: string;
  color: string;
  blurb: string;
};

const ENCOUNTER_META: Record<RunMapEncounterType, EncounterMeta> = {
  combat: {
    Icon: Crosshair,
    label: "Combat",
    color: "#22d3ee",
    blurb: "Standard fight room",
  },
  hellhound: {
    Icon: PawPrint,
    label: "Elite",
    color: "#f87171",
    blurb: "Harder fight, better payout",
  },
  shop: {
    Icon: ShoppingBag,
    label: "Shop",
    color: "#facc15",
    blurb: "Spend coins here",
  },
  boss: {
    Icon: Crown,
    label: "Boss",
    color: "#e879f9",
    blurb: "Ends the run",
  },
};

const UNKNOWN_META: EncounterMeta = {
  Icon: CircleHelp,
  label: "Unknown",
  color: "#94a3b8",
  blurb: "Reveals when you get closer",
};

const REWARD_STYLES: Record<RunMapReward["type"], { chip: string }> = {
  coins: { chip: "border-amber-300/45 bg-amber-400/12 text-amber-100" },
  heal: { chip: "border-emerald-300/45 bg-emerald-400/12 text-emerald-100" },
  shopDiscount: {
    chip: "border-yellow-300/45 bg-yellow-400/14 text-yellow-100",
  },
  shopStock: { chip: "border-violet-300/45 bg-violet-400/14 text-violet-100" },
  damageBoost: { chip: "border-rose-300/45 bg-rose-400/14 text-rose-100" },
};

const COLUMN_WIDTH = 164;
const ROW_HEIGHT = 152;
const MAP_TOP_PADDING = 150;
const MAP_BOTTOM_PADDING = 190;
const BOSS_LIFT = 46;
const JITTER_X = 22;
const JITTER_Y = 13;
const DRAG_THRESHOLD = 6;

const NODE_SIZES: Record<"boss" | "major" | "normal", number> = {
  boss: 92,
  major: 68,
  normal: 60,
};

type MapPoint = { x: number; y: number };

type MapEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  source: MapPoint;
  target: MapPoint;
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function nodeHash(id: string, salt: number) {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function getNodeSize(node: RunMapNode) {
  if (node.encounterType === "boss") return NODE_SIZES.boss;
  if (node.encounterType !== "combat") return NODE_SIZES.major;
  return NODE_SIZES.normal;
}

function getNodeMeta(node: RunMapNode, hidden: boolean): EncounterMeta {
  return hidden ? UNKNOWN_META : ENCOUNTER_META[node.encounterType];
}

function isHiddenNode(
  node: RunMapNode,
  mysteryNodeIds: Set<string>,
  revealedNodeIds: Set<string>,
) {
  return mysteryNodeIds.has(node.id) && !revealedNodeIds.has(node.id);
}

function renderRewardChip(reward: RunMapReward) {
  const style = REWARD_STYLES[reward.type];
  return (
    <span
      key={`${reward.type}-${reward.label}`}
      className={`inline-flex items-center rounded-full border px-2 py-1 font-sans text-xs font-medium ${style.chip}`}
      title={reward.description}
    >
      {reward.label}
    </span>
  );
}

const MapNodeButton = memo(function MapNodeButton({
  node,
  position,
  selectable,
  visited,
  current,
  hidden,
  highlighted,
  characterEmoji,
  onHoverNode,
  onTravelNode,
}: {
  node: RunMapNode;
  position: MapPoint;
  selectable: boolean;
  visited: boolean;
  current: boolean;
  hidden: boolean;
  highlighted: boolean;
  characterEmoji?: string;
  onHoverNode: (nodeId: string | null, anchor?: DOMRect) => void;
  onTravelNode: (nodeId: string) => void;
}) {
  const meta = getNodeMeta(node, hidden);
  const Icon = meta.Icon;
  const size = getNodeSize(node);
  const isBoss = node.encounterType === "boss";
  const isMajor = isBoss || node.encounterType !== "combat";
  const dimmed = !current && !selectable && !highlighted && !visited;

  const handleEnter = (event: ReactMouseEvent<HTMLButtonElement>) => {
    onHoverNode(node.id, event.currentTarget.getBoundingClientRect());
  };

  return (
    <button
      type="button"
      aria-label={`${meta.label} room${selectable ? " - reachable" : ""}`}
      aria-disabled={!selectable}
      onClick={() => onTravelNode(node.id)}
      onMouseEnter={handleEnter}
      onMouseLeave={() => onHoverNode(null)}
      onFocus={(event) =>
        onHoverNode(node.id, event.currentTarget.getBoundingClientRect())
      }
      onBlur={() => onHoverNode(null)}
      data-map-node-id={node.id}
      data-map-node-depth={node.depth}
      data-map-node-type={node.encounterType}
      data-map-node-selectable={selectable ? "true" : "false"}
      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-200 ${
        selectable ? "cursor-pointer hover:scale-110" : "cursor-default"
      } ${current || selectable ? "animate-[mapNodePulse_1.9s_ease-in-out_infinite]" : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size,
        height: size,
        filter: hidden
          ? "saturate(0.3)"
          : dimmed
            ? "saturate(0.7)"
            : "none",
      }}
    >
      {(current || selectable) && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -9,
            background: `radial-gradient(circle, ${meta.color}55, transparent 70%)`,
            filter: "blur(4px)",
          }}
        />
      )}
      {current && (
        <div
          className="absolute rounded-full pointer-events-none animate-[mapNodePulse_1.6s_ease-in-out_infinite]"
          style={{
            inset: -13,
            border: `1.5px solid ${meta.color}a0`,
            boxShadow: `0 0 20px ${meta.color}55`,
          }}
        />
      )}
      <div
        className="relative h-full w-full rounded-full border-2"
        style={{
          borderColor: hidden
            ? highlighted
              ? "rgba(226,232,240,0.8)"
              : "rgba(148,163,184,0.45)"
            : `${meta.color}${current ? "ff" : selectable ? "e8" : highlighted ? "c0" : visited ? "a0" : "70"}`,
          background: hidden
            ? "radial-gradient(circle at 40% 35%, rgba(148,163,184,0.22), rgba(2,4,14,0.94) 80%)"
            : `radial-gradient(circle at 38% 30%, rgba(255,255,255,0.5), ${meta.color}${current ? "70" : selectable ? "55" : visited ? "40" : "2e"} 38%, rgba(5,2,20,0.97) 80%)`,
          boxShadow: current
            ? `0 0 ${isBoss ? 40 : 26}px ${meta.color}88, inset 0 0 14px ${meta.color}33`
            : selectable
              ? `0 0 ${isBoss ? 32 : 20}px ${meta.color}70, inset 0 0 10px ${meta.color}26`
              : highlighted
                ? `0 0 16px ${meta.color}44`
                : "none",
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <Icon
            className={`${isBoss ? "h-10 w-10" : isMajor ? "h-7 w-7" : "h-6 w-6"}`}
            style={{
              color: hidden ? "rgba(226,232,240,0.9)" : meta.color,
              filter:
                current || selectable
                  ? `drop-shadow(0 0 5px ${meta.color}aa)`
                  : "none",
            }}
          />
        </div>
      </div>
      {visited && !current && (
        <div
          className="absolute -top-1 -right-1 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full border pointer-events-none"
          style={{
            borderColor: `${meta.color}90`,
            background: "rgba(4,8,20,0.9)",
          }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: meta.color }}
          />
        </div>
      )}
      {current && characterEmoji && (
        <div
          className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border text-[15px]"
          style={{
            borderColor: `${meta.color}80`,
            background: "rgba(4,8,20,0.92)",
            boxShadow: `0 0 16px ${meta.color}44`,
          }}
        >
          {characterEmoji}
        </div>
      )}
    </button>
  );
});

export default function RunMapOverlay({
  runMap,
  currentDepth,
  threatTier,
  onSelectNode,
  localPlayerName = null,
  localPlayerCoins = 0,
  localPlayerCharacterType = null,
}: RunMapOverlayProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerX: number;
    pointerY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const nodesById = useMemo(
    () => new Map(runMap.nodes.map((node) => [node.id, node])),
    [runMap.nodes],
  );
  const reachableNodeIds = useMemo(
    () => new Set(runMap.reachableNodeIds),
    [runMap.reachableNodeIds],
  );
  const mysteryNodeIds = useMemo(
    () => new Set(runMap.mysteryNodeIds || []),
    [runMap.mysteryNodeIds],
  );
  const revealedNodeIds = useMemo(
    () => new Set(runMap.revealedNodeIds),
    [runMap.revealedNodeIds],
  );
  const visitedNodeIds = useMemo(
    () => new Set(runMap.visitedNodeIds),
    [runMap.visitedNodeIds],
  );

  const currentNode = runMap.currentNodeId
    ? nodesById.get(runMap.currentNodeId) || null
    : null;
  const hoveredNode = hoveredNodeId
    ? nodesById.get(hoveredNodeId) || null
    : null;
  const hoveredHidden = hoveredNode
    ? isHiddenNode(hoveredNode, mysteryNodeIds, revealedNodeIds)
    : false;
  const maxDepth = useMemo(
    () => runMap.nodes.reduce((max, node) => Math.max(max, node.depth), 0),
    [runMap.nodes],
  );
  const columnCount = useMemo(
    () => runMap.nodes.reduce((max, node) => Math.max(max, node.lane + 1), 1),
    [runMap.nodes],
  );
  const character = localPlayerCharacterType
    ? getCharacter(localPlayerCharacterType)
    : null;

  const mapWidth = columnCount * COLUMN_WIDTH;
  const mapHeight =
    MAP_TOP_PADDING + BOSS_LIFT + maxDepth * ROW_HEIGHT + MAP_BOTTOM_PADDING;
  const startMarker: MapPoint = {
    x: mapWidth / 2,
    y: MAP_TOP_PADDING + BOSS_LIFT + maxDepth * ROW_HEIGHT + 84,
  };

  const nodePositions = useMemo(() => {
    const positions = new Map<string, MapPoint>();
    runMap.nodes.forEach((node) => {
      const isBoss = node.encounterType === "boss";
      const jitterX = isBoss ? 0 : (nodeHash(node.id, 3) - 0.5) * 2 * JITTER_X;
      const jitterY = isBoss ? 0 : (nodeHash(node.id, 7) - 0.5) * 2 * JITTER_Y;
      positions.set(node.id, {
        x: node.lane * COLUMN_WIDTH + COLUMN_WIDTH / 2 + jitterX,
        y:
          MAP_TOP_PADDING +
          (maxDepth - node.depth) * ROW_HEIGHT +
          (isBoss ? 0 : BOSS_LIFT) +
          jitterY,
      });
    });
    return positions;
  }, [runMap.nodes, maxDepth]);

  const edges = useMemo<MapEdge[]>(
    () =>
      runMap.nodes.flatMap((node) =>
        node.nextNodeIds
          .map((targetId) => {
            const target = nodePositions.get(targetId);
            const source = nodePositions.get(node.id);
            if (!source || !target) return null;
            return {
              id: `${node.id}->${targetId}`,
              sourceId: node.id,
              targetId,
              source,
              target,
            };
          })
          .filter((edge): edge is MapEdge => Boolean(edge)),
      ),
    [runMap.nodes, nodePositions],
  );

  const startEdges = useMemo(() => {
    if (currentNode) return [];
    return runMap.nodes
      .filter((node) => node.depth === 1)
      .map((node) => ({
        id: `start->${node.id}`,
        targetId: node.id,
        target: nodePositions.get(node.id)!,
      }))
      .filter((edge) => Boolean(edge.target));
  }, [currentNode, runMap.nodes, nodePositions]);

  const focusNode = currentNode;
  const focusY = focusNode
    ? nodePositions.get(focusNode.id)?.y || startMarker.y
    : startMarker.y;

  const centerOnPlayer = () => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    viewport.scrollTop = clampValue(
      focusY - viewport.clientHeight * 0.72,
      0,
      viewport.scrollHeight,
    );
    const focusX = currentNode
      ? nodePositions.get(currentNode.id)?.x ?? startMarker.x
      : startMarker.x;
    viewport.scrollLeft = Math.max(
      0,
      (viewport.scrollWidth - mapWidth) / 2 + focusX - viewport.clientWidth / 2,
    );
    setHoveredNodeId(null);
    setTooltipAnchor(null);
  };

  useEffect(() => {
    centerOnPlayer();
    // Only position the view when the map opens, not when inspecting nodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHoverNode = useCallback(
    (nodeId: string | null, anchor?: DOMRect) => {
      setHoveredNodeId(nodeId);
      setTooltipAnchor(nodeId && anchor ? anchor : null);
    },
    [],
  );

  const handleTravelNode = useCallback(
    (nodeId: string) => {
      if (suppressClickRef.current) return;
      if (!reachableNodeIds.has(nodeId)) return;
      onSelectNode(nodeId);
    },
    [onSelectNode, reachableNodeIds],
  );

  const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const viewport = scrollRef.current;
    if (!viewport) return;
    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      moved: false,
    };
    setIsDragging(true);

    const handleMove = (moveEvent: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const dx = moveEvent.clientX - drag.pointerX;
      const dy = moveEvent.clientY - drag.pointerY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
      viewport.scrollLeft = drag.scrollLeft - dx;
      viewport.scrollTop = drag.scrollTop - dy;
    };
    const handleUp = () => {
      suppressClickRef.current = Boolean(dragStateRef.current?.moved);
      dragStateRef.current = null;
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMove);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp, { once: true });
  };

  const hoveredSelectable = hoveredNode
    ? reachableNodeIds.has(hoveredNode.id)
    : false;
  const hoveredVisited = hoveredNode
    ? visitedNodeIds.has(hoveredNode.id)
    : false;
  const hoveredCurrent = hoveredNode?.id === currentNode?.id;

  return (
    <motion.div
      className="absolute inset-0 z-[70] overflow-hidden bg-[radial-gradient(circle_at_16%_18%,rgba(255,0,255,0.16),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(0,255,255,0.14),transparent_30%),linear-gradient(180deg,rgb(14,4,35),rgb(3,6,26)_52%,rgb(12,4,28))] backdrop-blur-sm"
      initial={{ opacity: 0, scale: 1.03, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.985, filter: "blur(10px)" }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="absolute -left-16 top-14 h-72 w-72 rounded-full bg-fuchsia-500/14 blur-3xl" />
      <div className="absolute right-10 top-20 h-80 w-80 rounded-full bg-cyan-300/14 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(transparent_92%,rgba(0,255,255,0.07)_100%),linear-gradient(90deg,transparent_92%,rgba(255,0,255,0.06)_100%)] bg-[size:100%_18px,18px_100%] opacity-45" />

      <motion.div
        className="absolute left-4 top-4 right-4 z-[2] flex items-start justify-between gap-3 sm:left-6 sm:right-6"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.28, delay: 0.04 }}
      >
        <div className="min-w-0 rounded-xl border border-white/10 bg-[#090b16]/95 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-[6px] border border-cyan-300/70 bg-cyan-300/14 px-3 py-1 font-vt323 text-[13px] uppercase tracking-[0.28em] text-cyan-100">
              Route Map
            </div>
            <div className="font-sans text-sm text-slate-300">
              Floor {currentDepth}/{maxDepth}
            </div>
          </div>
          <div className="mt-2 font-press-start text-[10px] leading-5 text-yellow-100 sm:text-xs">
            Choose your next room.
          </div>
          <div className="mt-2 hidden font-sans text-sm leading-5 text-slate-300 sm:block">
            {currentNode
              ? "Follow a path upward. Every road ends at the boss."
              : "Pick a starting room. Every road ends at the boss."}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="rounded-[10px] border-2 border-yellow-300/70 bg-[#160b20]/86 px-4 py-3 text-right shadow-[0_0_24px_rgba(255,234,0,0.18)] backdrop-blur-md">
            <div className="font-press-start text-[8px] text-amber-200/65">
              Coins
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 font-vt323 text-[24px] leading-none text-amber-100">
              <Coins className="h-5 w-5 text-amber-300" />
              {Math.max(0, Math.floor(localPlayerCoins))}
            </div>
          </div>
          <div className="rounded-[10px] border-2 border-fuchsia-400/70 bg-[#160b20]/86 px-4 py-3 text-right shadow-[0_0_24px_rgba(255,0,255,0.18)] backdrop-blur-md">
            <div className="font-press-start text-[8px] text-fuchsia-300/60">
              Threat
            </div>
            <div className="mt-1 font-vt323 text-[24px] leading-none text-white/88">
              {Math.max(0, threatTier)}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-x-4 bottom-4 top-40 overflow-hidden rounded-xl border border-white/15 bg-[linear-gradient(180deg,#0b1024,#060916)] sm:inset-x-6 sm:bottom-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.32, delay: 0.08 }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[2px] bg-gradient-to-r from-fuchsia-400/20 via-cyan-200/80 to-yellow-200/20" />
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          className={`absolute inset-0 z-[1] select-none overflow-auto ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(34,211,238,0.35) transparent" }}
        >
          <div className="flex min-h-full min-w-full w-max justify-center">
            <div
              className="relative shrink-0"
              style={{ width: mapWidth, height: mapHeight }}
            >
              <svg
                className="absolute inset-0"
                width={mapWidth}
                height={mapHeight}
              >
                {startEdges.map((edge) => (
                  <line
                    key={edge.id}
                    x1={startMarker.x}
                    y1={startMarker.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke="rgba(34,211,238,0.55)"
                    strokeWidth={2}
                    strokeDasharray="6 7"
                  />
                ))}
                {edges.map((edge) => {
                  const traveled =
                    visitedNodeIds.has(edge.sourceId) &&
                    visitedNodeIds.has(edge.targetId);
                  const frontier =
                    currentNode?.id === edge.sourceId &&
                    reachableNodeIds.has(edge.targetId);
                  const hovered =
                    hoveredNodeId === edge.sourceId ||
                    hoveredNodeId === edge.targetId;
                  return (
                    <line
                      key={edge.id}
                      x1={edge.source.x}
                      y1={edge.source.y}
                      x2={edge.target.x}
                      y2={edge.target.y}
                      stroke={
                        traveled
                          ? "rgba(255,234,0,0.6)"
                          : frontier
                            ? "rgba(34,211,238,0.8)"
                            : hovered
                              ? "rgba(226,232,240,0.5)"
                              : "rgba(148,163,184,0.38)"
                      }
                      strokeWidth={traveled || frontier ? 3 : 1.6}
                      strokeDasharray={traveled ? "none" : "5 7"}
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {!currentNode && (
                <div
                  className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                  style={{ left: startMarker.x, top: startMarker.y }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/60 bg-[#05091a]/90 text-[18px] shadow-[0_0_22px_rgba(34,211,238,0.35)]">
                    {character?.emoji || "◎"}
                  </div>
                  <div className="font-press-start text-[7px] tracking-[0.2em] text-cyan-200/70">
                    START
                  </div>
                </div>
              )}

              {runMap.nodes.map((node) => {
                const position = nodePositions.get(node.id);
                if (!position) return null;
                return (
                  <MapNodeButton
                    key={node.id}
                    node={node}
                    position={position}
                    selectable={reachableNodeIds.has(node.id)}
                    visited={visitedNodeIds.has(node.id)}
                    current={currentNode?.id === node.id}
                    hidden={isHiddenNode(node, mysteryNodeIds, revealedNodeIds)}
                    highlighted={hoveredNodeId === node.id}
                    characterEmoji={character?.emoji}
                    onHoverNode={handleHoverNode}
                    onTravelNode={handleTravelNode}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <details className="absolute right-4 top-4 z-[3] w-[200px] rounded-xl border border-white/15 bg-[#090b16]/95 p-3">
          <summary className="cursor-pointer font-sans text-sm font-medium text-slate-200">
            Legend
          </summary>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {[UNKNOWN_META, ...Object.values(ENCOUNTER_META)].map((meta) => (
              <div
                key={meta.label}
                className="inline-flex items-center gap-2.5 rounded-[8px] border border-white/10 bg-white/[0.03] px-2.5 py-1.5"
              >
                <meta.Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: meta.color }}
                />
                <div className="min-w-0">
                  <div className="font-sans text-sm text-white/90">
                    {meta.label}
                  </div>
                  <div className="mt-0.5 font-sans text-xs leading-5 text-slate-400">
                    {meta.blurb}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>

        <motion.div
          className="absolute bottom-4 left-4 right-4 z-[3] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#090b16]/95 px-4 py-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, delay: 0.12 }}
        >
          <div className="font-sans text-sm text-slate-300">
            Scroll or drag to explore. Click a glowing room to travel.
          </div>
          <button type="button" onClick={centerOnPlayer} className="rounded-md border border-cyan-300/30 px-3 py-2 font-sans text-sm text-cyan-200 transition hover:bg-cyan-300/10">
            Centre on player
          </button>
        </motion.div>
      </motion.div>

      {hoveredNode && tooltipAnchor && (
        <div
          className="pointer-events-none fixed z-[130] w-[270px] -translate-x-1/2 rounded-[14px] border border-white/12 bg-[linear-gradient(180deg,rgba(3,7,18,0.97),rgba(6,10,26,0.97))] p-3.5 text-white shadow-[0_22px_80px_rgba(0,0,0,0.5)]"
          style={{
            left: clampValue(
              tooltipAnchor.left + tooltipAnchor.width / 2,
              150,
              window.innerWidth - 150,
            ),
            top: Math.max(12, tooltipAnchor.top - 14),
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="font-press-start text-[9px]"
            style={{ color: getNodeMeta(hoveredNode, hoveredHidden).color }}
          >
            {getNodeMeta(hoveredNode, hoveredHidden).label}
          </div>
          <div className="mt-2 font-sans text-lg font-semibold leading-6 text-white">
            {hoveredHidden
              ? "Unknown Room"
              : hoveredNode.title ||
                getNodeMeta(hoveredNode, false).label}
          </div>
          <div className="mt-1.5 font-sans text-sm leading-5 text-slate-300">
            Floor {hoveredNode.depth}
            <span className="mx-2 text-white/22">|</span>
            {hoveredCurrent
              ? "Current room"
              : hoveredVisited
                ? "Cleared"
                : hoveredSelectable
                  ? "Click to travel"
                  : hoveredHidden
                    ? "Reveals when you get closer"
                    : "Locked for now"}
          </div>
          {!hoveredHidden && (hoveredNode.rewards || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(hoveredNode.rewards || []).map((reward) =>
                renderRewardChip(reward),
              )}
            </div>
          )}
          {localPlayerName && hoveredCurrent && (
            <div className="mt-3 font-sans text-sm text-slate-300">
              {localPlayerName} is here
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
