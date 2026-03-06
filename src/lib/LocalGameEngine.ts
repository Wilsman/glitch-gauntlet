import type {
  CombatEncounterPhase,
  GameState,
  RunMapEncounterType,
  RunMapNode,
  RunMapReward,
  RunMapState,
  Player,
  InputState,
  UpgradeOption,
  Enemy,
  Projectile,
  XpOrb,
  Teleporter,
  DamageNumber,
  StatusEffect,
  Explosion,
  ChainLightning,
  Pet,
  CharacterType,
  OrbitalSkull,
  FireTrail,
  Turret,
  Clone,
  Boss,
  ShockwaveRing,
  Vector2D,
  Particle,
  ScreenShake,
  Hazard,
  HazardType,
  EnemyType,
  BossType,
  RunMapRouteId,
  UpgradeType,
  ShopOffer,
  ShopStand,
} from "@shared/types";
import { ALL_UPGRADES, getRandomUpgrades } from "@shared/upgrades";
import { applyUpgradeEffect } from "@shared/upgradeEffects";
import { createEnemy } from "@shared/enemyConfig";
import { getCharacter } from "@shared/characterConfig";
import {
  incrementLevel10Count,
  checkUnlocks,
  saveLastRunStats,
  recordGameEnd,
  incrementBossDefeats,
  recordExtractionWin,
  recordSurvivalTime,
  recordNoHitAfterWave5Win,
} from "./progressionStorage";
import {
  createBoss,
  getBossForWave,
  BOSS_CONFIGS,
  BERSERKER_CHARGE_TELEGRAPH,
  BERSERKER_CHARGE_SPEED,
  BERSERKER_CHARGE_DURATION,
  BERSERKER_ENRAGED_CHARGE_COUNT,
  BERSERKER_SLAM_TELEGRAPH,
  BERSERKER_SLAM_RINGS,
  BERSERKER_ENRAGED_SLAM_RINGS,
  BERSERKER_SLAM_RING_SPACING,
  BERSERKER_SLAM_RING_SPEED,
  BERSERKER_SLAM_DAMAGE,
  GOLEM_GLITCH_ZONE_DURATION,
  GOLEM_ENRAGED_SHOCKWAVE_COUNT,
  SWARM_DASH_TELEGRAPH,
  SWARM_DASH_SPEED,
  SWARM_ENRAGED_BIT_COUNT,
  OVERCLOCKER_BURST_TELEGRAPH,
  OVERCLOCKER_TIME_SLOW_RADIUS,
  OVERCLOCKER_TIME_SLOW_FACTOR,
  MAGNUS_FLUX_TELEGRAPH,
  MAGNUS_FLUX_DURATION,
  REAPER_DASH_TELEGRAPH,
  REAPER_DECOY_COUNT,
  REAPER_ENRAGED_DECOY_COUNT,
  CORE_SATELLITE_COUNT,
  CORE_BEAM_TELEGRAPH,
  CORE_ENRAGED_ROTATION_SPEED,
  SUMMONER_PORTAL_TELEGRAPH,
  SUMMONER_PORTAL_SPAWN_INTERVAL,
  SUMMONER_PORTAL_HEALTH,
  SUMMONER_PORTAL_COUNT,
  SUMMONER_TELEPORT_TELEGRAPH,
  SUMMONER_BEAM_TELEGRAPH,
  SUMMONER_BEAM_SPEED,
  SUMMONER_BEAM_DAMAGE,
  SUMMONER_VOID_WELL_PULL_FORCE,
  ARCHITECT_LASER_COUNT,
  ARCHITECT_LASER_ROTATION_SPEED,
  ARCHITECT_LASER_TELEGRAPH,
  ARCHITECT_LASER_DAMAGE,
  ARCHITECT_FLOOR_HAZARD_TELEGRAPH,
  ARCHITECT_FLOOR_HAZARD_SIZE,
  ARCHITECT_FLOOR_HAZARD_DAMAGE,
  ARCHITECT_FLOOR_HAZARD_COUNT,
  ARCHITECT_SHIELD_GENERATOR_HEALTH,
  ARCHITECT_SHIELD_GENERATOR_COUNT,
  MAGNUS_TESLA_BALL_COUNT,
  MAGNUS_TESLA_BALL_BASE_RADIUS,
  MAGNUS_TESLA_BALL_OSCILLATION_AMPLITUDE,
  MAGNUS_TESLA_BALL_ROTATION_SPEED,
  MAGNUS_TESLA_BALL_DAMAGE,
  SWARM_CLOUD_TELEGRAPH,
  OVERCLOCKER_SLOW_TELEGRAPH,
  MAGNUS_STORM_TELEGRAPH,
  SHOTGUN_CONE_ANGLE,
  SHOTGUN_PROJECTILE_COUNT,
  RADIAL_PROJECTILE_COUNT,
  PROJECTILE_BOMB_DELAY,
} from "@shared/bossConfig";

const MAX_PLAYERS = 4;
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const PLAYER_COLORS = ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF00"];
const TICK_RATE = 50; // ms
const WIN_WAVE = 5;
const REVIVE_DURATION = 3000; // 3 seconds to revive
const EXTRACTION_DURATION = 5000; // 5 seconds to extract
const HELLHOUND_ROUND_INTERVAL = 10; // Waves 5, 15, 25...
const HELLHOUND_ROUND_START = 5; // First hellhound round at wave 5
const SHOP_INTERACT_RADIUS = 90;
const SHOP_HEAL_AMOUNT = 35;
const SHOP_BASELINE_MULTIPLIER = 1.3;
const SHOP_COST_ROUNDING = 5;
const SHOP_MIN_BASELINE_COST = 45;
const COIN_DROP_PER_KILL = 1;
const LUCKY_COIN_MULTIPLIER = 2;
const FACEHUGGER_SLOW_MULTIPLIER = 0.72;
const FACEHUGGER_REQUIRED_SHAKES = 5;
const PLAYER_HEART_SLOTS = 5;
const PLAYER_HIT_INVULNERABILITY_MS = 5000;
const SLUGGER_STRAFE_SWAP_MIN_MS = 1250;
const SLUGGER_STRAFE_SWAP_VARIANCE_MS = 950;
const NEON_PULSE_TELEGRAPH_MS = 900;
const NEON_PULSE_ZONE_DURATION_MS = 2600;
const NEON_PULSE_ZONE_DAMAGE_INTERVAL_MS = 320;
const NEON_PULSE_ZONE_DAMAGE = 10;
const TANK_BOT_CHARGE_TELEGRAPH_MS = 700;
const TANK_BOT_CHARGE_DURATION_MS = 650;
const TANK_BOT_CHARGE_SPEED = 7.5;
const TANK_BOT_CHARGE_KNOCKBACK = 80;
const HELLHOUND_PACK_RADIUS = 220;
const HELLHOUND_PACK_BOOST = 1.35;
const HELLHOUND_PACK_OFFSET_RADIUS = 55;
const LEECH_BEACON_SUPPORT_RADIUS = 220;
const LEECH_BEACON_SUPPORT_DURATION_MS = 1800;
const LEECH_BEACON_SUPPORT_HEAL = 18;
const BOMBER_TELEGRAPH_MS = 750;
const BOMBER_EXPLOSION_RADIUS = 130;
const BOMBER_KNOCKBACK = 68;
const ORBIT_DRONE_STRAFE_SWAP_MIN_MS = 1800;
const ORBIT_DRONE_STRAFE_SWAP_VARIANCE_MS = 900;
const GOLEM_GLITCH_ZONE_RADIUS = 320;
const GOLEM_GLITCH_ZONE_PULL_FORCE = 1.9;
const GOLEM_GLITCH_ZONE_PROJECTILE_INTERVAL = 140;
const GOLEM_COLLAPSE_PULSE_INTERVAL = 320;
const GOLEM_COLLAPSE_TELEGRAPH = 1400;
const GOLEM_BUILDER_DROP_TELEGRAPH = 1380;
const GOLEM_BUILDER_DROP_CHAIN_DELAY = 840;
const GOLEM_BUILDER_DROP_RADIUS = 135;
const COMBAT_INTERMISSION_BASE_MS = 1350;
const COMBAT_INTERMISSION_STEP_MS = 180;
const COMBAT_SPAWN_GRACE_MS = 450;
const COMBAT_PACK_ENEMY_CAP_BASE = 6;
const COMBAT_PACK_ENEMY_CAP_WAVE_SCALAR = 0.9;
const COMBAT_PACK_ENEMY_CAP_LEVEL_SCALAR = 0.4;

// Performance optimization constants
const DAMAGE_NUMBER_THROTTLE_MS = 100; // Merge hits within this window
const MAX_DAMAGE_NUMBERS_PER_ENEMY = 5; // Cap visible damage numbers per enemy
const MAX_STATUS_EFFECTS_PER_ENEMY = 3; // Cap status effects per enemy

type CombatPackStyle = "solo" | "group" | "mixed";
type CombatPackFormation = "line" | "cluster" | "staggered";

interface CombatSpawnPack {
  enemies: EnemyType[];
  style: CombatPackStyle;
  formation: CombatPackFormation;
  side: 0 | 1 | 2 | 3;
  cooldownMs: number;
}

const COMBAT_ENEMY_THREAT: Record<EnemyType, number> = {
  grunt: 1,
  slugger: 1.5,
  hellhound: 2.4,
  splitter: 2.4,
  "mini-splitter": 0.5,
  "neon-pulse": 2.7,
  "glitch-spider": 1.1,
  "tank-bot": 4.2,
  "leech-beacon": 2.8,
  bomber: 1.4,
  "orbit-drone": 1.9,
};

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to add damage numbers with throttling and capping
function addDamageNumber(
  enemy: {
    damageNumbers?: {
      id: string;
      damage: number;
      isCrit: boolean;
      position: { x: number; y: number };
      timestamp: number;
    }[];
  },
  damage: number,
  isCrit: boolean,
  position: { x: number; y: number },
  now: number,
) {
  if (!enemy.damageNumbers) enemy.damageNumbers = [];

  // Throttle: merge with recent damage number if within threshold
  const recentNumber = enemy.damageNumbers.find(
    (dmg) => now - dmg.timestamp < DAMAGE_NUMBER_THROTTLE_MS,
  );

  if (recentNumber) {
    // Merge damage into existing number
    recentNumber.damage += damage;
    recentNumber.isCrit = recentNumber.isCrit || isCrit; // Keep crit if either was crit
    return;
  }

  // Cap: remove oldest if at limit
  if (enemy.damageNumbers.length >= MAX_DAMAGE_NUMBERS_PER_ENEMY) {
    enemy.damageNumbers.shift(); // Remove oldest
  }

  enemy.damageNumbers.push({
    id: uuidv4(),
    damage: Math.round(damage),
    isCrit,
    position: { ...position },
    timestamp: now,
  });
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const RADIAL_ROUTE_ORDER: RunMapRouteId[] = ["north", "east", "south", "west"];
const RADIAL_ROUTE_ANGLES: Record<RunMapRouteId, number> = {
  north: -Math.PI / 2,
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
};
const RADIAL_ROUTE_SPIN: Record<RunMapRouteId, 1 | -1> = {
  north: 1,
  east: -1,
  south: 1,
  west: -1,
};
const RADIAL_ROUTE_BIASES: Record<RunMapRouteId, RewardBias> = {
  north: "economy",
  east: "power",
  south: "recovery",
  west: "power",
};
const RADIAL_ROUTE_SPECIALS: Record<RunMapRouteId, RunMapEncounterType> = {
  north: "shop",
  east: "combat",
  south: "combat",
  west: "hellhound",
};
const RADIAL_ROUTE_NAMES: Record<RunMapRouteId, string> = {
  north: "Broker Spoke",
  east: "War Spoke",
  south: "Recovery Spoke",
  west: "Hunt Spoke",
};
const RADIAL_BOSS_POOL: BossType[] = [
  "berserker",
  "summoner",
  "architect",
  "glitch-golem",
  "viral-swarm",
  "overclocker",
  "magnetic-magnus",
  "neon-reaper",
  "core-destroyer",
];
const NODE_CLUSTER_SPACING_MULTIPLIER = 2;

type RewardBias = "economy" | "recovery" | "power";

type ProceduralRunMapNode = {
  id: string;
  depth: number;
  lane: number;
  routeId: RunMapRouteId;
  x: number;
  y: number;
  encounterType: RunMapEncounterType;
  nextNodeIds: string[];
  title?: string;
  bossType?: BossType;
  rewards?: RunMapReward[];
};

function formatBossRouteLabel(bossType: BossType) {
  return bossType
    .split("-")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pickOne<T>(random: () => number, values: T[]) {
  return values[Math.floor(random() * values.length)];
}

function shuffle<T>(random: () => number, values: T[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function cloneRewards(rewards?: RunMapReward[]) {
  return rewards?.map((reward) => ({ ...reward })) || [];
}

function createCoinsReward(value: number): RunMapReward {
  return {
    type: "coins",
    value,
    label: `+${value}C`,
    description: `Gain ${value} coins after this node.`,
  };
}

function createHealReward(value: number): RunMapReward {
  return {
    type: "heal",
    value,
    label: `+${value}HP`,
    description: `Restore ${value} health when this node resolves.`,
  };
}

function createShopDiscountReward(value: number): RunMapReward {
  return {
    type: "shopDiscount",
    value,
    label: `-${value}%`,
    description: `Reduce all market prices by ${value}% in this shop.`,
  };
}

function createShopStockReward(value: number): RunMapReward {
  return {
    type: "shopStock",
    value,
    label: `+${value} STOCK`,
    description: `Adds ${value} extra upgrade offer${value === 1 ? "" : "s"} to this shop.`,
  };
}

function createDamageBoostReward(
  value: number,
  durationWaves: number,
): RunMapReward {
  return {
    type: "damageBoost",
    value,
    label: `+${value}% DMG`,
    description: `Gain ${value}% bonus damage for ${durationWaves} wave${durationWaves === 1 ? "" : "s"}.`,
    durationWaves,
  };
}

const COMBAT_ROUTE_TITLES = [
  "Signal Clash",
  "Packet Raid",
  "Kill Switch",
  "Pulse Break",
  "System Breach",
  "Static Clash",
];

const SHOP_ROUTE_TITLES = [
  "Black Market",
  "Patch Bazaar",
  "Smuggler Cache",
  "Armory Leak",
  "Backdoor Vendor",
  "Ghost Vendor",
];

const HELLHOUND_TITLES = ["Hellhound Pack", "Dog Gauntlet", "Rabid Kennels"];
const ROUTE_ENTRY_TITLES: Record<RunMapRouteId, string[]> = {
  north: ["Ledger Gate", "Broker Relay", "Credit Junction"],
  east: ["Breaker Lane", "Kill Corridor", "Aggressor Gate"],
  south: ["Patch Relay", "Recovery Bay", "Pulse Shelter"],
  west: ["Kennel Break", "Predator Track", "Hunt Relay"],
};
const ROUTE_FORK_TITLES: Record<RunMapRouteId, string[]> = {
  north: ["Discount Route", "Stock Route", "Broker Split", "Market Vein"],
  east: ["Kill Route", "Breach Route", "War Split", "Spike Line"],
  south: ["Med Route", "Shield Route", "Recovery Split", "Safe Vein"],
  west: ["Claw Route", "Snare Route", "Dog Split", "Rabid Lane"],
};
const ROUTE_SPECIAL_TITLES: Record<RunMapRouteId, string[]> = {
  north: SHOP_ROUTE_TITLES,
  east: ["Overdrive Route", "Damage Corridor", "War Engine"],
  south: ["Repair Lattice", "Patch Node", "Recovery Grid"],
  west: HELLHOUND_TITLES,
};
const ROUTE_PREP_TITLES: Record<RunMapRouteId, string[]> = {
  north: ["Broker Threshold", "Vault Door", "Final Purchase"],
  east: ["War Threshold", "Kill Gate", "Pressure Door"],
  south: ["Recovery Threshold", "Safety Lock", "Final Patch"],
  west: ["Hunt Threshold", "Kennel Gate", "Predator Door"],
};

function createCombatRewards(
  random: () => number,
  depth: number,
  bias: RewardBias,
): RunMapReward[] {
  const scaledDepth = Math.max(1, depth);

  if (bias === "economy") {
    return [
      createCoinsReward(
        randomInt(random, 10 + scaledDepth * 3, 16 + scaledDepth * 4),
      ),
    ];
  }

  if (bias === "recovery") {
    return [
      createHealReward(
        randomInt(random, 10 + scaledDepth * 2, 16 + scaledDepth * 3),
      ),
    ];
  }

  return [
    createDamageBoostReward(
      randomInt(random, 12, 24),
      scaledDepth >= 6 ? 2 : 1,
    ),
  ];
}

function createHellhoundRewards(
  random: () => number,
  depth: number,
  bias: RewardBias,
): RunMapReward[] {
  const rewards: RunMapReward[] = [
    createCoinsReward(randomInt(random, 22 + depth * 2, 30 + depth * 3)),
  ];

  if (bias === "recovery") {
    rewards.push(createHealReward(randomInt(random, 18, 28)));
  } else {
    rewards.push(createDamageBoostReward(randomInt(random, 18, 28), 2));
  }

  return rewards;
}

function createShopRewards(
  random: () => number,
  depth: number,
  bias: RewardBias,
): RunMapReward[] {
  const rewards: RunMapReward[] = [
    createShopDiscountReward(randomInt(random, 15, depth >= 7 ? 28 : 22)),
  ];

  if (depth >= 5 || random() > 0.35) {
    rewards.push(createShopStockReward(1));
  }

  if (bias === "recovery" && random() > 0.4) {
    rewards.push(createHealReward(randomInt(random, 14, 24)));
  } else if (bias === "economy" && random() > 0.45) {
    rewards.push(createCoinsReward(randomInt(random, 12, 24)));
  }

  return rewards;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickWeightedUnique<T>(
  random: () => number,
  source: T[],
  count: number,
  weightFor: (item: T) => number,
): T[] {
  const pool = [...source];
  const chosen: T[] = [];

  while (pool.length > 0 && chosen.length < count) {
    const weights = pool.map((item) => Math.max(0.001, weightFor(item)));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = random() * totalWeight;
    let pickIndex = 0;
    for (let index = 0; index < pool.length; index++) {
      roll -= weights[index];
      if (roll <= 0) {
        pickIndex = index;
        break;
      }
    }
    chosen.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }

  return chosen;
}

function createRunMapNodes(seed: string): ProceduralRunMapNode[] {
  const random = createSeededRandom(hashString(seed) || Date.now());
  const shuffledBosses = shuffle(random, RADIAL_BOSS_POOL);
  const routeBosses = new Map<RunMapRouteId, BossType>(
    RADIAL_ROUTE_ORDER.map((routeId, index) => [
      routeId,
      shuffledBosses[index],
    ]),
  );

  const BOSS_DEPTH = 16;
  const NUM_LAYERS = 15;
  const LANE_COUNT = 5;
  const NUM_PATHS = 4;
  const allNodes: ProceduralRunMapNode[] = [];

  for (const routeId of RADIAL_ROUTE_ORDER) {
    const bias = RADIAL_ROUTE_BIASES[routeId];
    const bossType = routeBosses.get(routeId) || "berserker";

    // --- Slay the Spire path generation ---
    // Fewer paths (4) = clearer fork decisions
    const paths: number[][] = [];
    // Spread starting lanes for maximum initial divergence
    const startLanes = shuffle(random, [0, 1, 3, 4]);
    for (let p = 0; p < NUM_PATHS; p++) {
      paths.push([startLanes[p]]);
    }

    // Sort path indices by starting lane to establish order
    const pathOrder = Array.from({ length: NUM_PATHS }, (_, i) => i);
    pathOrder.sort((a, b) => paths[a][0] - paths[b][0]);

    // Evolve paths layer by layer with crossing prevention
    for (let layer = 1; layer < NUM_LAYERS; layer++) {
      for (let oi = 0; oi < pathOrder.length; oi++) {
        const p = pathOrder[oi];
        const prevLane = paths[p][layer - 1];
        const shift = randomInt(random, -1, 1);
        let newLane = clamp(prevLane + shift, 0, LANE_COUNT - 1);

        // Maintain left-to-right order: don't go below left neighbor
        if (oi > 0) {
          const leftLane = paths[pathOrder[oi - 1]][layer];
          if (newLane < leftLane) newLane = leftLane;
        }

        paths[p].push(newLane);
      }
    }

    // --- Create nodes at unique (depth, lane) positions ---
    const nodeGrid = new Map<string, ProceduralRunMapNode>();

    for (let layer = 0; layer < NUM_LAYERS; layer++) {
      const depth = layer + 1;
      const lanesAtLayer = new Set<number>();
      for (const path of paths) {
        lanesAtLayer.add(path[layer]);
      }

      for (const lane of lanesAtLayer) {
        const key = `${depth}-${lane}`;
        if (!nodeGrid.has(key)) {
          const nodeId = `${routeId}-d${depth}-l${lane}`;
          const node: ProceduralRunMapNode = {
            id: nodeId,
            depth,
            lane,
            routeId,
            x: 0,
            y: 0,
            encounterType: "combat",
            nextNodeIds: [],
            title: "",
            rewards: [],
          };
          nodeGrid.set(key, node);
          allNodes.push(node);
        }
      }
    }

    // --- Connect nodes based on path trajectories ---
    for (const path of paths) {
      for (let layer = 0; layer < NUM_LAYERS - 1; layer++) {
        const fromKey = `${layer + 1}-${path[layer]}`;
        const toKey = `${layer + 2}-${path[layer + 1]}`;
        const fromNode = nodeGrid.get(fromKey);
        const toNode = nodeGrid.get(toKey);
        if (fromNode && toNode && !fromNode.nextNodeIds.includes(toNode.id)) {
          fromNode.nextNodeIds.push(toNode.id);
        }
      }
    }

    // --- Boss node ---
    const bossNode: ProceduralRunMapNode = {
      id: `${routeId}-boss`,
      depth: BOSS_DEPTH,
      lane: Math.floor(LANE_COUNT / 2),
      routeId,
      x: 0,
      y: 0,
      encounterType: "boss",
      nextNodeIds: [],
      title: `${RADIAL_ROUTE_NAMES[routeId]} | ${formatBossRouteLabel(bossType)}`,
      bossType,
      rewards: [],
    };
    allNodes.push(bossNode);

    // Connect all final-layer nodes to boss
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const key = `${NUM_LAYERS}-${lane}`;
      const node = nodeGrid.get(key);
      if (node && !node.nextNodeIds.includes(bossNode.id)) {
        node.nextNodeIds.push(bossNode.id);
      }
    }

    // --- Strategic encounter placement ---
    // Group nodes by depth to find fork points
    const nodesByDepth = new Map<number, ProceduralRunMapNode[]>();
    for (const node of nodeGrid.values()) {
      if (!nodesByDepth.has(node.depth)) nodesByDepth.set(node.depth, []);
      nodesByDepth.get(node.depth)!.push(node);
    }

    // At fork points (depth with 2+ nodes), assign DIFFERENT types
    // so the player sees a meaningful choice: risk vs safety
    const middleLane = (LANE_COUNT - 1) / 2;
    for (const [depth, nodes] of nodesByDepth) {
      if (depth <= 1 || depth >= NUM_LAYERS) continue;
      if (nodes.length < 2) continue;

      // Sort by lane: outer lanes = risky, inner lanes = safe
      const sorted = [...nodes].sort(
        (a, b) => Math.abs(b.lane - middleLane) - Math.abs(a.lane - middleLane),
      );

      // At key depths, guarantee mixed encounter types at forks
      const isKeyFork =
        depth === 3 ||
        depth === 5 ||
        depth === 8 ||
        depth === 11 ||
        depth === 13;
      if (isKeyFork && sorted.length >= 2) {
        // Outermost node = hellhound (risky, better rewards)
        sorted[0].encounterType = "hellhound";
        // Innermost node = shop (safe, utility)
        sorted[sorted.length - 1].encounterType = "shop";
      } else if (sorted.length >= 2 && random() > 0.45) {
        // Even at non-key forks, often make one branch different
        const roll = random();
        if (roll < 0.5) {
          sorted[0].encounterType = "hellhound";
        } else {
          sorted[sorted.length - 1].encounterType = "shop";
        }
      }
    }

    // Scatter additional hellhounds on outer-lane nodes (risk paths)
    const outerCombat = Array.from(nodeGrid.values()).filter(
      (n) =>
        n.encounterType === "combat" &&
        n.depth >= 4 &&
        n.depth <= 13 &&
        Math.abs(n.lane - middleLane) >= 1.5,
    );
    const extraHH =
      routeId === "west" ? randomInt(random, 1, 3) : randomInt(random, 0, 2);
    pickWeightedUnique(random, outerCombat, extraHH, (n) => {
      return 1 + Math.abs(n.lane - middleLane) * 0.5;
    }).forEach((n) => {
      n.encounterType = "hellhound";
    });

    // Scatter additional shops on inner-lane nodes (safe paths)
    const innerCombat = Array.from(nodeGrid.values()).filter(
      (n) =>
        n.encounterType === "combat" &&
        n.depth >= 3 &&
        n.depth <= 12 &&
        Math.abs(n.lane - middleLane) <= 1,
    );
    pickWeightedUnique(random, innerCombat, randomInt(random, 1, 2), (n) => {
      return 1 + 1 / (1 + Math.abs(n.lane - middleLane));
    }).forEach((n) => {
      n.encounterType = "shop";
    });

    // Ensure minimums: at least 2 shops and 2 hellhounds per route
    const routeNodes = Array.from(nodeGrid.values());
    const shopCount = routeNodes.filter(
      (n) => n.encounterType === "shop",
    ).length;
    if (shopCount < 2) {
      const fallbacks = routeNodes.filter(
        (n) => n.encounterType === "combat" && n.depth >= 3 && n.depth <= 12,
      );
      pickWeightedUnique(random, fallbacks, 2 - shopCount, () => 1).forEach(
        (n) => {
          n.encounterType = "shop";
        },
      );
    }
    const hhCount = routeNodes.filter(
      (n) => n.encounterType === "hellhound",
    ).length;
    if (hhCount < 2) {
      const fallbacks = routeNodes.filter(
        (n) => n.encounterType === "combat" && n.depth >= 4 && n.depth <= 13,
      );
      pickWeightedUnique(random, fallbacks, 2 - hhCount, () => 1).forEach(
        (n) => {
          n.encounterType = "hellhound";
        },
      );
    }

    // --- Assign titles and rewards ---
    // Hellhounds on outer lanes get boosted rewards (risk = reward)
    routeNodes.forEach((node) => {
      if (node.depth === 1) {
        node.title = pickOne(random, ROUTE_ENTRY_TITLES[routeId]);
      } else if (node.encounterType === "shop") {
        node.title = pickOne(random, SHOP_ROUTE_TITLES);
      } else if (node.encounterType === "hellhound") {
        node.title = pickOne(random, HELLHOUND_TITLES);
      } else if (node.depth >= NUM_LAYERS - 1) {
        node.title = pickOne(random, ROUTE_PREP_TITLES[routeId]);
      } else if (node.depth <= 3) {
        node.title = pickOne(random, ROUTE_SPECIAL_TITLES[routeId]);
      } else {
        node.title = pickOne(random, ROUTE_FORK_TITLES[routeId]);
      }

      // Risk multiplier: outer lanes get better loot
      const riskBonus = Math.abs(node.lane - middleLane) / middleLane;
      const effectiveDepth = Math.min(
        node.depth +
          (node.encounterType === "hellhound" ? Math.round(riskBonus * 3) : 0),
        BOSS_DEPTH - 1,
      );

      node.rewards =
        node.encounterType === "shop"
          ? createShopRewards(random, effectiveDepth, bias)
          : node.encounterType === "hellhound"
            ? createHellhoundRewards(random, effectiveDepth, bias)
            : createCombatRewards(random, effectiveDepth, bias);
    });
  }

  return allNodes;
}

function createInitialRunMap(seed: string): RunMapState {
  const nodes: RunMapNode[] = createRunMapNodes(seed).map((node) => ({
    id: node.id,
    depth: node.depth,
    lane: node.lane,
    routeId: node.routeId,
    x: node.x,
    y: node.y,
    encounterType: node.encounterType,
    title: node.title,
    bossType: node.bossType,
    rewards: cloneRewards(node.rewards),
    nextNodeIds: [...node.nextNodeIds],
  }));

  const depthOneIds = nodes
    .filter((node) => node.depth === 1)
    .map((node) => node.id);
  const allNodeIds = nodes.map((node) => node.id);

  return {
    floorIndex: 1,
    nodes,
    currentNodeId: null,
    reachableNodeIds: depthOneIds,
    revealedNodeIds: allNodeIds,
    visitedNodeIds: [],
  };
}

export class LocalGameEngine {
  private gameState: GameState;
  private stateVersion: number = 0;
  private snapshotVersion: number = -1;
  private cachedSnapshot: GameState | null = null;
  private lastTick: number = 0;
  private tickInterval: number | null = null;
  private upgradeChoices: Map<string, UpgradeOption[]> = new Map();
  private combatSpawnQueue: CombatSpawnPack[] = [];
  private combatSpawnCooldownMs: number = 0;
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private level10Tracked: Set<string> = new Set(); // Track which players already counted for level 10
  private onUnlock?: (characterType: CharacterType) => void;
  private gameStartTime: number = 0;
  private enemiesKilledCount: number = 0;
  private characterType: CharacterType;
  private tookDamageAfterWave5: boolean = false;
  private lastToasterDeployAt: Map<string, number> = new Map();
  private returnToMapAfterUpgrade: boolean = false;

  constructor(
    playerId: string,
    characterType: CharacterType = "pet-pal-percy",
    playerName?: string,
  ) {
    const character = getCharacter(characterType);
    this.characterType = characterType;
    this.gameStartTime = Date.now();
    const initialRunMap = createInitialRunMap(
      `${playerId}-${characterType}-${Date.now()}`,
    );

    const initialPlayer: Player = {
      id: playerId,
      name: playerName,
      position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
      health: character.baseHealth,
      maxHealth: character.baseHealth,
      level: 1,
      xp: 0,
      xpToNextLevel: 20,
      coins: 0,
      color: PLAYER_COLORS[0],
      attackCooldown: 0,
      attackSpeed: character.baseAttackSpeed,
      status: "alive",
      speed: character.baseSpeed,
      projectileDamage: character.baseDamage,
      reviveProgress: 0,
      pickupRadius: 100,
      projectilesPerShot: 1,
      critChance: 0,
      critMultiplier: characterType === "glass-cannon-carl" ? 3 : 2,
      lifeSteal: 0,
      hasBananarang: false,
      bananarangsPerShot: 0,
      collectedUpgrades: [],
      characterType: character.type,
      weaponType: character.weaponType,
    };

    this.gameState = {
      gameId: "local",
      status: "mapSelection",
      runMap: initialRunMap,
      currentEncounterType: null,
      mapDepth: 0,
      players: [initialPlayer],
      enemies: [],
      projectiles: [],
      xpOrbs: [],
      upgradePromptType: null,
      isShopRound: false,
      shopStands: [],
      shopPrompt: null,
      shopPendingBossType: null,
      wave: 0,
      teleporter: null,
      pets: [],
      orbitalSkulls: [],
      fireTrails: [],
      turrets: [],
      clones: [],
      waveTimer: 0,
      encounterWave: 0,
      encounterWavesTotal: 0,
      encounterPhase: null,
      encounterEnemiesRemaining: 0,
      encounterEnemiesTotal: 0,
      encounterIntermissionMs: 0,
      boss: null,
      shockwaveRings: [],
      bossProjectiles: [],
      bossDefeatedRewardClaimed: false,
      hazards: [],
    };

    // Pet Pal Percy starts with a pet
    if (character.startsWithPet) {
      const startingPet: Pet = {
        id: uuidv4(),
        ownerId: playerId,
        position: { ...initialPlayer.position },
        health: 100, // Dachshunds are tough
        maxHealth: 100,
        level: 1,
        xp: 0,
        xpToNextLevel: 10,
        damage: 8, // Biting ankles is effective
        attackSpeed: 600,
        attackCooldown: 0,
        emoji: "🐕",
      };
      this.gameState.pets = [startingPet];
      initialPlayer.hasPet = true;
    }

    // Character-specific initialization
    if (characterType === "vampire-vex") {
      initialPlayer.vampireDrainRadius = 50; // Base drain radius
    }
    if (characterType === "dash-dynamo") {
      initialPlayer.blinkCooldown = 0;
      initialPlayer.blinkReady = true;
    }
    if (character.weaponType === "burst-fire") {
      initialPlayer.burstShotsFired = 0;
    }
  }

  private getCurrentMapNode(state: GameState): RunMapNode | null {
    const currentNodeId = state.runMap?.currentNodeId;
    if (!currentNodeId) return null;
    return (
      state.runMap?.nodes.find((node) => node.id === currentNodeId) || null
    );
  }

  private getCurrentNodeRewards(state: GameState) {
    return this.getCurrentMapNode(state)?.rewards || [];
  }

  private applyRunMapRewards(state: GameState, rewards: RunMapReward[]) {
    const alivePlayers = state.players.filter(
      (player) => player.status === "alive",
    );
    if (alivePlayers.length === 0 || rewards.length === 0) return;

    const now = Date.now();
    rewards.forEach((reward) => {
      if (reward.type === "coins") {
        alivePlayers.forEach((player) => {
          player.coins = (player.coins || 0) + reward.value;
        });
        return;
      }

      if (reward.type === "heal") {
        alivePlayers.forEach((player) => {
          player.health = Math.min(
            player.maxHealth,
            player.health + reward.value,
          );
          player.lastHealedTimestamp = now;
        });
        return;
      }

      if (reward.type === "damageBoost") {
        const durationWaves = Math.max(1, reward.durationWaves || 1);
        const multiplier = 1 + reward.value / 100;
        alivePlayers.forEach((player) => {
          player.temporaryDamageMultiplier = Math.max(
            player.temporaryDamageMultiplier || 1,
            multiplier,
          );
          player.temporaryDamageExpiresWave = Math.max(
            player.temporaryDamageExpiresWave || state.wave,
            state.wave + durationWaves,
          );
        });
      }
    });
  }

  private getShopModifiersFromRewards(rewards: RunMapReward[]) {
    const discountPercent = rewards
      .filter((reward) => reward.type === "shopDiscount")
      .reduce((total, reward) => total + reward.value, 0);
    const extraStock = rewards
      .filter((reward) => reward.type === "shopStock")
      .reduce((total, reward) => total + reward.value, 0);
    const entryRewards = rewards.filter(
      (reward) => reward.type !== "shopDiscount" && reward.type !== "shopStock",
    );

    return {
      discountPercent,
      extraStock,
      entryRewards,
      summaryLabels: rewards.map((reward) => reward.label),
    };
  }

  private resetArenaForEncounter(state: GameState) {
    state.enemies = [];
    state.projectiles = [];
    state.xpOrbs = [];
    state.teleporter = null;
    state.explosions = [];
    state.chainLightning = [];
    state.boss = null;
    state.shockwaveRings = [];
    state.bossProjectiles = [];
    state.hazards = [];
    state.particles = [];
    state.screenShake = undefined;
    state.isShopRound = false;
    state.shopStands = [];
    state.shopPrompt = null;
    state.shopPendingBossType = null;
    state.isHellhoundRound = false;
    state.hellhoundRoundPending = false;
    state.hellhoundRoundComplete = false;
    state.waitingForHellhoundRound = false;
    state.totalHellhoundsInRound = 0;
    state.hellhoundsKilled = 0;
    state.hellhoundSpawnTimer = 0;
    state.players.forEach((player) => {
      player.attachedBug = undefined;
      player.wasShakePressed = false;
    });
    this.resetCombatEncounterState(state);
    state.waveTimer = 0;
    this.returnToMapAfterUpgrade = false;
  }

  private resetCombatEncounterState(state: GameState) {
    this.combatSpawnQueue = [];
    this.combatSpawnCooldownMs = 0;
    state.encounterWave = 0;
    state.encounterWavesTotal = 0;
    state.encounterPhase = null;
    state.encounterEnemiesRemaining = 0;
    state.encounterEnemiesTotal = 0;
    state.encounterIntermissionMs = 0;
  }

  private enterMapSelection(state: GameState) {
    const runMap = state.runMap;
    const currentNode = this.getCurrentMapNode(state);
    if (!runMap || !currentNode) return;

    this.resetArenaForEncounter(state);
    state.status = "mapSelection";
    state.currentEncounterType = null;
    state.mapDepth = currentNode.depth;
    runMap.reachableNodeIds = [...currentNode.nextNodeIds];
    runMap.revealedNodeIds = Array.from(
      new Set([...runMap.revealedNodeIds, ...currentNode.nextNodeIds]),
    );
  }

  private startCombatEncounter(state: GameState) {
    this.resetArenaForEncounter(state);
    state.status = "playing";
    state.currentEncounterType = "combat";
    state.encounterWavesTotal = this.getCombatEncounterWaveCount(state);
    this.beginCombatEncounterWave(state, 1);
  }

  private getAveragePlayerLevel(state: GameState): number {
    const players = state.players.length > 0 ? state.players : this.gameState.players;
    if (players.length === 0) return 1;
    return (
      players.reduce((sum, player) => sum + Math.max(1, player.level || 1), 0) /
      players.length
    );
  }

  private getCombatEncounterWaveCountForTier(
    wave: number,
    averagePlayerLevel: number,
  ): number {
    return Math.max(
      2,
      Math.min(5, 2 + Math.floor((wave + averagePlayerLevel * 0.75) / 4)),
    );
  }

  private getCombatEncounterWaveCount(state: GameState): number {
    return this.getCombatEncounterWaveCountForTier(
      Math.max(1, state.wave || 1),
      this.getAveragePlayerLevel(state),
    );
  }

  private getAvailableCombatEnemyTypes(threatTier: number): EnemyType[] {
    const types: EnemyType[] = ["grunt", "slugger"];

    if (threatTier >= 3.5) types.push("glitch-spider");
    if (threatTier >= 5.5) types.push("splitter");
    if (threatTier >= 6.5) types.push("bomber");
    if (threatTier >= 7.5) types.push("neon-pulse");
    if (threatTier >= 8.5) types.push("orbit-drone");
    if (threatTier >= 9.5) types.push("leech-beacon");
    if (threatTier >= 11.5) types.push("tank-bot");

    return types;
  }

  private randomFrom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  private getPackThreat(pack: CombatSpawnPack): number {
    return pack.enemies.reduce(
      (sum, type) => sum + (COMBAT_ENEMY_THREAT[type] || 1),
      0,
    );
  }

  private createCombatSpawnPack(
    threatTier: number,
    style: CombatPackStyle,
    targetThreat: number,
    isFinalPack: boolean,
  ): CombatSpawnPack {
    const available = this.getAvailableCombatEnemyTypes(threatTier);
    const heavyPool = available.filter((type) =>
      ["splitter", "neon-pulse", "leech-beacon", "tank-bot"].includes(type),
    );
    const fastPool = available.filter((type) =>
      ["grunt", "glitch-spider", "bomber"].includes(type),
    );
    const supportPool = available.filter((type) =>
      ["slugger", "orbit-drone", "leech-beacon", "neon-pulse"].includes(type),
    );
    const packEnemies: EnemyType[] = [];

    if (style === "solo") {
      const anchorType =
        heavyPool.length > 0
          ? this.randomFrom(heavyPool)
          : this.randomFrom(available.filter((type) => type !== "grunt"));
      packEnemies.push(anchorType);

      let escortsBudget = Math.max(0, targetThreat - this.getPackThreat({
        enemies: packEnemies,
        style,
        formation: "cluster",
        side: 0,
        cooldownMs: 0,
      }));
      const escorts = Math.min(
        isFinalPack ? 3 : 2,
        Math.max(0, Math.floor(escortsBudget / 1.15)),
      );
      for (let i = 0; i < escorts; i++) {
        packEnemies.push(this.randomFrom(fastPool.length > 0 ? fastPool : ["grunt"]));
      }
    } else if (style === "group") {
      const groupPool = available.filter(
        (type) => type !== "tank-bot" && type !== "leech-beacon",
      );
      const groupType = this.randomFrom(groupPool);
      const unitThreat = COMBAT_ENEMY_THREAT[groupType] || 1;
      const minCount = groupType === "grunt" ? 4 : groupType === "glitch-spider" ? 3 : 2;
      const maxCount =
        groupType === "grunt"
          ? 7
          : groupType === "glitch-spider"
            ? 6
            : groupType === "slugger"
              ? 4
              : 3;
      const count = Math.max(
        minCount,
        Math.min(maxCount, Math.round(targetThreat / Math.max(1, unitThreat))),
      );
      for (let i = 0; i < count; i++) {
        packEnemies.push(groupType);
      }
      if (supportPool.length > 0 && targetThreat >= 6 && Math.random() < 0.45) {
        packEnemies.push(this.randomFrom(supportPool));
      }
    } else {
      const leaderPool = heavyPool.length > 0 ? heavyPool : available;
      packEnemies.push(this.randomFrom(leaderPool));
      const desiredCount = Math.max(
        3,
        Math.min(6, 2 + Math.round(targetThreat / 2.4)),
      );
      while (packEnemies.length < desiredCount) {
        const pool =
          packEnemies.length === 1 && fastPool.length > 0
            ? fastPool
            : available.filter((type) => type !== "tank-bot" || isFinalPack);
        packEnemies.push(this.randomFrom(pool));
      }
    }

    return {
      enemies: packEnemies,
      style,
      formation:
        style === "solo"
          ? "cluster"
          : style === "group"
            ? Math.random() < 0.5
              ? "line"
              : "cluster"
            : "staggered",
      side: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      cooldownMs: Math.max(
        420,
        1100 - packEnemies.length * 85 - Math.round(threatTier * 18),
      ),
    };
  }

  private buildCombatSpawnQueue(
    state: GameState,
    encounterWave: number,
    encounterWavesTotal: number,
  ): CombatSpawnPack[] {
    const averagePlayerLevel = this.getAveragePlayerLevel(state);
    const threatTier =
      Math.max(1, state.wave || 1) +
      Math.max(0, averagePlayerLevel - 1) * 0.7 +
      (encounterWave - 1) * 0.95;
    const packCount = Math.max(
      2,
      Math.min(
        5,
        2 + Math.floor(threatTier / 4) + (encounterWave === encounterWavesTotal ? 1 : 0),
      ),
    );
    let remainingThreat =
      4.5 + threatTier * 1.7 + encounterWave * 1.25 + averagePlayerLevel * 0.35;
    const queue: CombatSpawnPack[] = [];

    for (let packIndex = 0; packIndex < packCount; packIndex++) {
      const packsLeft = packCount - packIndex;
      const isFinalPack = packIndex === packCount - 1;
      const style: CombatPackStyle =
        isFinalPack && threatTier >= 6
          ? "mixed"
          : packIndex === 0 && threatTier >= 8
            ? "solo"
            : packIndex % 2 === 0
              ? "group"
              : "mixed";
      const targetThreat = Math.max(
        2.6,
        Math.min(9.8, remainingThreat / packsLeft + (isFinalPack ? 1.2 : 0)),
      );
      const pack = this.createCombatSpawnPack(
        threatTier,
        style,
        targetThreat,
        isFinalPack,
      );
      queue.push(pack);
      remainingThreat = Math.max(0, remainingThreat - this.getPackThreat(pack));
    }

    return queue;
  }

  private syncCombatEncounterState(
    state: GameState,
    phaseOverride?: CombatEncounterPhase | null,
  ) {
    state.encounterPhase = phaseOverride ?? state.encounterPhase ?? "spawning";
    state.encounterEnemiesRemaining =
      state.enemies.length +
      this.combatSpawnQueue.reduce((sum, pack) => sum + pack.enemies.length, 0);
  }

  private beginCombatEncounterWave(state: GameState, encounterWave: number) {
    const encounterWavesTotal =
      state.encounterWavesTotal || this.getCombatEncounterWaveCount(state);
    const queue = this.buildCombatSpawnQueue(
      state,
      encounterWave,
      encounterWavesTotal,
    );

    this.combatSpawnQueue = queue;
    this.combatSpawnCooldownMs = COMBAT_SPAWN_GRACE_MS;
    state.encounterWave = encounterWave;
    state.encounterWavesTotal = encounterWavesTotal;
    state.encounterIntermissionMs = 0;
    state.encounterEnemiesTotal = queue.reduce(
      (sum, pack) => sum + pack.enemies.length,
      0,
    );
    this.syncCombatEncounterState(state, "spawning");
  }

  private startHellhoundEncounter(state: GameState) {
    this.resetArenaForEncounter(state);
    state.status = "playing";
    state.currentEncounterType = "hellhound";
    state.isHellhoundRound = true;
    state.totalHellhoundsInRound = Math.min(
      24,
      8 + Math.max(0, (state.wave || 1) - HELLHOUND_ROUND_START) * 2,
    );
    state.hellhoundsKilled = 0;
    state.hellhoundRoundComplete = false;
    state.hellhoundSpawnTimer = 0;
  }

  private startBossEncounter(state: GameState) {
    this.resetArenaForEncounter(state);
    state.status = "bossFight";
    state.currentEncounterType = "boss";
    const currentNode = this.getCurrentMapNode(state);
    const bossType = currentNode?.bossType || getBossForWave(10) || "berserker";
    state.boss = createBoss(
      uuidv4(),
      { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
      bossType,
      Math.max(10, state.wave || 10),
    );
    this.triggerScreenShake(15, 500);
  }

  selectMapNode(nodeId: string) {
    const state = this.gameState;
    const runMap = state.runMap;
    if (!runMap || state.status !== "mapSelection") return;
    if (!runMap.reachableNodeIds.includes(nodeId)) return;

    const node = runMap.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return;

    runMap.currentNodeId = node.id;
    if (!runMap.visitedNodeIds.includes(node.id)) {
      runMap.visitedNodeIds.push(node.id);
    }
    runMap.reachableNodeIds = [];
    runMap.revealedNodeIds = Array.from(
      new Set([...runMap.revealedNodeIds, node.id, ...node.nextNodeIds]),
    );
    state.mapDepth = node.depth;
    state.wave = node.depth;

    if (node.encounterType === "shop") {
      state.currentEncounterType = "shop";
      this.startShopRound(state, null, node.rewards || []);
    } else if (node.encounterType === "hellhound") {
      this.startHellhoundEncounter(state);
    } else if (node.encounterType === "boss") {
      this.startBossEncounter(state);
    } else {
      this.startCombatEncounter(state);
    }

    this.markStateDirty();
  }

  start() {
    if (this.tickInterval) return;
    this.lastTick = Date.now();
    this.tickInterval = window.setInterval(() => this.tick(), TICK_RATE);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  setIsPaused(paused: boolean) {
    if (this.gameState.isPaused === paused) return;
    this.gameState.isPaused = paused;
    // Reset lastTick when unpausing to prevent big delta jump
    if (!paused) {
      this.lastTick = Date.now();
    }
    this.markStateDirty();
  }

  getGameState(): GameState {
    // Clone only when game state changed since the previous snapshot.
    if (this.cachedSnapshot && this.snapshotVersion === this.stateVersion) {
      return this.cachedSnapshot;
    }

    this.cachedSnapshot = JSON.parse(JSON.stringify(this.gameState));
    this.snapshotVersion = this.stateVersion;
    return this.cachedSnapshot;
  }

  setOnUnlockCallback(callback: (characterType: CharacterType) => void) {
    this.onUnlock = callback;
  }

  updateInput(input: InputState) {
    // Clone the input to avoid reference issues
    this.inputState = { ...input };
  }

  useBlink() {
    const player = this.gameState.players[0];
    if (player) {
      this.handleBlinkForPlayer(player);
      this.markStateDirty();
    }
  }

  handleBlinkForPlayer(player: Player) {
    const now = Date.now();

    // Dash (Boss Upgrade) logic
    if (player.canDash) {
      if (!player.lastDashTime || now - player.lastDashTime > 3000) {
        this.handleDash(player);
        player.lastDashTime = now;
        return;
      }
    }

    if (player.characterType !== "dash-dynamo") return;
    if (
      !player.blinkReady ||
      (player.blinkCooldown !== undefined && player.blinkCooldown > 0)
    )
      return;

    // Blink 150 units in the direction of movement
    const input = this.getCurrentInput(player);
    if (!input) return;

    let dx = 0;
    let dy = 0;

    if (input.analogX !== undefined && input.analogY !== undefined) {
      dx = input.analogX;
      dy = input.analogY;
    } else {
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
    }

    // If no movement input, blink forward (right)
    if (dx === 0 && dy === 0) {
      dx = 1;
    }

    // Normalize and apply blink distance
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      dx = (dx / dist) * 150;
      dy = (dy / dist) * 150;

      // Apply blink with bounds checking
      player.position.x = Math.max(
        15,
        Math.min(ARENA_WIDTH - 15, player.position.x + dx),
      );
      player.position.y = Math.max(
        15,
        Math.min(ARENA_HEIGHT - 15, player.position.y + dy),
      );

      // Set cooldown (5 seconds)
      player.blinkCooldown = 5000;
    }
  }

  private handleDash(player: Player) {
    const input = this.getCurrentInput(player);
    if (!input) return;

    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx === 0 && dy === 0) return;

    const dist = Math.hypot(dx, dy);
    dx = (dx / dist) * 200;
    dy = (dy / dist) * 200;

    player.position.x = Math.max(
      15,
      Math.min(ARENA_WIDTH - 15, player.position.x + dx),
    );
    player.position.y = Math.max(
      15,
      Math.min(ARENA_HEIGHT - 15, player.position.y + dy),
    );

    this.spawnParticles(
      player.position,
      player.color || "#00FFFF",
      20,
      "glitch",
      10,
    );
    this.triggerScreenShake(5, 200);
  }

  useAbility() {
    const player = this.gameState.players[0];
    if (player) {
      this.handleAbilityForPlayer(player);
      this.markStateDirty();
    }
  }

  handleAbilityForPlayer(player: Player) {
    if (!player || player.status !== "alive") return;
    if (player.abilityCooldown && player.abilityCooldown > 0) return;

    if (player.hasSystemOverload) {
      this.triggerScreenShake(20, 500);
      this.spawnParticles(player.position, "#FFFFFF", 80, "glitch", 30);
      this.gameState.enemies = [];
      if (this.gameState.boss) {
        this.gameState.boss.health -= this.gameState.boss.maxHealth * 0.1;
      }
    }

    switch (player.characterType) {
      case "spray-n-pray":
        player.isAbilityActive = true;
        player.abilityDuration = 4000;
        player.abilityCooldown = 12000;
        this.triggerScreenShake(3, 200);
        break;
      case "boom-bringer":
        // Cluster Bomb
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          this.gameState.projectiles.push({
            id: uuidv4(),
            ownerId: player.id,
            position: { ...player.position },
            velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
            damage: player.projectileDamage * 2,
            kind: "bullet",
            radius: 12,
            hitEnemies: [],
          });
        }
        player.abilityCooldown = 8000;
        this.triggerScreenShake(10, 300);
        break;
      case "glass-cannon-carl":
        player.isAbilityActive = true;
        player.abilityDuration = 5000; // Duration for the next few shots
        player.abilityCooldown = 15000;
        this.triggerScreenShake(5, 400);
        break;
      case "pet-pal-percy":
        player.isAbilityActive = true;
        player.abilityDuration = 6000;
        player.abilityCooldown = 18000;
        this.triggerScreenShake(2, 500);
        break;
      case "dash-dynamo":
        player.isAbilityActive = true;
        player.abilityDuration = 3000;
        player.abilityCooldown = 15000;
        this.triggerScreenShake(5, 500);
        this.spawnParticles(player.position, "#00FFFF", 40, "glitch", 12);
        // Overdrive: Invulnerability handled in updateAbilities if we add it
        player.isInvulnerable = true;
        player.invulnerableUntil = Date.now() + 3000;
        break;
      case "vampire-vex":
        player.isAbilityActive = true;
        player.abilityDuration = 5000;
        player.abilityCooldown = 20000;
        // Massive heal
        player.health = Math.min(player.maxHealth, player.health + 50);
        this.triggerScreenShake(4, 300);
        break;
      case "turret-tina":
        // Mega Turret
        this.placeTurretForPlayer(player);
        this.placeTurretForPlayer(player);
        this.placeTurretForPlayer(player);
        player.abilityCooldown = 10000;
        this.triggerScreenShake(6, 400);
        break;
    }
  }

  placeTurret() {
    const player = this.gameState.players[0];
    if (player) {
      this.placeTurretForPlayer(player);
      this.markStateDirty();
    }
  }

  private getCurrentInput(player: Player): InputState | undefined {
    if (player.id === this.gameState.players[0]?.id) {
      return this.inputState;
    }
    return player.lastInput;
  }

  private markStateDirty() {
    this.stateVersion++;
    this.cachedSnapshot = null;
  }

  placeTurretForPlayer(player: Player) {
    if (!player || player.characterType !== "turret-tina") return;
    this.spawnTurretForPlayer(player, "standard");
  }

  private getTurretUpgradeStacks(player: Player): number {
    return (
      player.collectedUpgrades?.find((u) => u.type === "turret")?.count || 0
    );
  }

  private getToasterTurretCap(player: Player): number {
    const stacks = this.getTurretUpgradeStacks(player);
    if (stacks <= 0) return 0;
    return Math.min(4, Math.max(2, 1 + stacks));
  }

  private spawnTurretForPlayer(
    player: Player,
    style: Turret["style"] = "standard",
  ) {
    if (!this.gameState.turrets) this.gameState.turrets = [];

    const playerTurrets = this.gameState.turrets.filter((t) =>
      style === "toaster"
        ? t.ownerId === player.id && t.style === "toaster"
        : t.ownerId === player.id && t.style !== "toaster",
    );
    const maxTurrets =
      style === "toaster" ? this.getToasterTurretCap(player) : 3;
    if (playerTurrets.length >= maxTurrets) {
      return; // Cannot place more turrets until one expires
    }

    const now = Date.now();
    const turretAttackSpeed =
      style === "toaster"
        ? Math.max(280, player.attackSpeed * 1.25)
        : Math.max(300, player.attackSpeed * 1.5);

    const newTurret: Turret = {
      id: uuidv4(),
      ownerId: player.id,
      position:
        style === "toaster"
          ? {
              x: Math.max(
                20,
                Math.min(
                  ARENA_WIDTH - 20,
                  player.position.x +
                    Math.cos(Math.random() * Math.PI * 2) * 65,
                ),
              ),
              y: Math.max(
                20,
                Math.min(
                  ARENA_HEIGHT - 20,
                  player.position.y +
                    Math.sin(Math.random() * Math.PI * 2) * 65,
                ),
              ),
            }
          : { ...player.position },
      health: style === "toaster" ? 70 : 50,
      maxHealth: style === "toaster" ? 70 : 50,
      damage: (style === "toaster" ? 10 : 8) + player.level * 2,
      attackSpeed: turretAttackSpeed,
      attackCooldown: 0,
      range: style === "toaster" ? 340 : 300,
      expiresAt: now + 20000, // 20 seconds duration
      style,
    };
    this.gameState.turrets.push(newTurret);
    if (style === "toaster") {
      this.lastToasterDeployAt.set(player.id, now);
    }
  }

  selectUpgrade(upgradeId: string) {
    const player = this.gameState.players[0];
    if (!player) return;

    const choices = this.upgradeChoices.get(player.id);
    const choice = choices?.find((c) => c.id === upgradeId);
    if (!choice) return;

    this.applyUpgradeChoice(player, choice);
    this.clearUpgradePrompt(player.id);
    if (this.returnToMapAfterUpgrade) {
      this.returnToMapAfterUpgrade = false;
      this.enterMapSelection(this.gameState);
    }
    this.markStateDirty();
  }

  private applyUpgradeChoice(player: Player, choice: UpgradeOption) {
    applyUpgradeEffect(player, choice);

    // Spawn pet if pet upgrade selected
    if (choice.type === "pet") {
      if (!this.gameState.pets) this.gameState.pets = [];
      const petEmojis = [
        "\uD83D\uDC36",
        "\uD83D\uDC31",
        "\uD83D\uDC30",
        "\uD83E\uDD8A",
        "\uD83D\uDC3B",
        "\uD83D\uDC3C",
        "\uD83D\uDC28",
        "\uD83D\uDC2F",
        "\uD83E\uDD81",
        "\uD83D\uDC38",
      ];
      const randomEmoji = choice.title.includes("Dachshund")
        ? "\uD83D\uDC15"
        : petEmojis[Math.floor(Math.random() * petEmojis.length)];
      const newPet: Pet = {
        id: uuidv4(),
        ownerId: player.id,
        position: { ...player.position },
        health: 50,
        maxHealth: 50,
        level: 1,
        xp: 0,
        xpToNextLevel: 10,
        damage: 5,
        attackSpeed: 800,
        attackCooldown: 0,
        emoji: randomEmoji,
      };
      this.gameState.pets.push(newPet);
    }

    // Spawn orbital skull if orbital upgrade selected
    if (choice.type === "orbital") {
      if (!this.gameState.orbitalSkulls) this.gameState.orbitalSkulls = [];
      const orbitalCount = player.orbitalCount || 0;
      const angleOffset = (Math.PI * 2) / orbitalCount;
      const newSkull: OrbitalSkull = {
        id: uuidv4(),
        ownerId: player.id,
        angle: angleOffset * (orbitalCount - 1),
        radius: 60,
        damage: 10 + player.level * 2,
      };
      this.gameState.orbitalSkulls.push(newSkull);
    }

    // Spawn toaster turret if turret upgrade selected
    if (choice.type === "turret") {
      const existingStacks = this.getTurretUpgradeStacks(player);
      const burstCount = Math.min(3, 2 + Math.floor(existingStacks / 2));
      for (let i = 0; i < burstCount; i++) {
        this.spawnTurretForPlayer(player, "toaster");
      }
    }

    // Track collected upgrade
    if (!player.collectedUpgrades) player.collectedUpgrades = [];
    const existing = player.collectedUpgrades.find(
      (u) => u.type === choice.type,
    );
    if (existing) {
      existing.count++;
      existing.title = choice.title;
      existing.rarity = choice.rarity;
      existing.emoji = choice.emoji;
    } else {
      player.collectedUpgrades.push({
        type: choice.type,
        title: choice.title,
        rarity: choice.rarity,
        emoji: choice.emoji,
        count: 1,
      });
    }
  }

  private roundShopCost(value: number): number {
    return Math.max(
      SHOP_COST_ROUNDING,
      Math.round(value / SHOP_COST_ROUNDING) * SHOP_COST_ROUNDING,
    );
  }

  private getExpectedEnemySpawnsPerWave(
    wave: number,
    averagePlayerLevel: number = this.getAveragePlayerLevel(this.gameState),
  ): number {
    const encounterWaves = this.getCombatEncounterWaveCountForTier(
      Math.max(1, wave),
      averagePlayerLevel,
    );
    return Math.round(
      (4 + Math.max(1, wave) + averagePlayerLevel * 0.8) * encounterWaves,
    );
  }

  private getShopCostBaseline(
    wave: number,
    averagePlayerLevel: number = this.getAveragePlayerLevel(this.gameState),
  ): number {
    return Math.max(
      SHOP_MIN_BASELINE_COST,
      this.getExpectedEnemySpawnsPerWave(wave, averagePlayerLevel) *
        SHOP_BASELINE_MULTIPLIER,
    );
  }

  private getShopUpgradeCost(
    option: UpgradeOption,
    wave: number,
    averagePlayerLevel: number = this.getAveragePlayerLevel(this.gameState),
  ): number {
    const baselineCost = this.getShopCostBaseline(wave, averagePlayerLevel);
    switch (option.rarity) {
      case "common":
        return this.roundShopCost(baselineCost * 0.95);
      case "uncommon":
        return this.roundShopCost(baselineCost * 1.2);
      case "legendary":
        return this.roundShopCost(baselineCost * 1.75);
      case "boss":
        return this.roundShopCost(baselineCost * 2.1);
      case "lunar":
      case "void":
        return this.roundShopCost(baselineCost * 1.5);
      default:
        return this.roundShopCost(baselineCost * 1.05);
    }
  }

  private createShopStands(
    wave: number,
    modifiers: { discountPercent?: number; extraStock?: number } = {},
  ): ShopStand[] {
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;
    const basePositions: { x: number; y: number }[] = [
      { x: centerX - 320, y: centerY + 32 },
      { x: centerX - 180, y: centerY - 64 },
      { x: centerX, y: centerY - 104 },
      { x: centerX + 180, y: centerY - 64 },
      { x: centerX + 320, y: centerY + 32 },
      { x: centerX - 90, y: centerY + 180 },
      { x: centerX + 90, y: centerY + 180 },
    ];
    const discountPercent = Math.max(0, modifiers.discountPercent || 0);
    const extraStock = Math.max(0, Math.min(2, modifiers.extraStock || 0));
    const priceMultiplier = Math.max(0.55, 1 - discountPercent / 100);
    const averagePlayerLevel = this.getAveragePlayerLevel(this.gameState);
    const rolled = getRandomUpgrades(2 + extraStock);
    const offers: ShopOffer[] = [
      ...rolled.map((option) => ({
        id: uuidv4(),
        type: "upgrade",
        title: option.title,
        description: option.description,
        emoji: option.emoji,
        rarity: option.rarity,
        cost: this.roundShopCost(
          this.getShopUpgradeCost(
            option as UpgradeOption,
            wave,
            averagePlayerLevel,
          ) *
            priceMultiplier,
        ),
        upgradeType: option.type,
        purchased: false,
      })),
      {
        id: uuidv4(),
        type: "heal",
        title: "Patch Kit",
        description: `Restore ${SHOP_HEAL_AMOUNT} HP.`,
        emoji: "HP",
        cost: this.roundShopCost(
          this.getShopCostBaseline(wave, averagePlayerLevel) * priceMultiplier,
        ),
        healAmount: SHOP_HEAL_AMOUNT,
        purchased: false,
      },
      {
        id: uuidv4(),
        type: "temporary",
        title: "Battle Surge",
        description: "+25% damage for the next 2 waves.",
        emoji: "DMG",
        cost: this.roundShopCost(
          this.getShopCostBaseline(wave, averagePlayerLevel) *
            1.35 *
            priceMultiplier,
        ),
        tempDamageMultiplier: 1.25,
        tempDurationWaves: 2,
        purchased: false,
      },
      {
        id: uuidv4(),
        type: "leave",
        title: "Leave Shop",
        description: "Exit and continue the run.",
        emoji: "OUT",
        cost: 0,
      },
    ];

    return offers.map((offer, idx) => ({
      id: uuidv4(),
      position: basePositions[idx] || { x: centerX, y: centerY },
      offer,
    }));
  }

  private openUpgradePrompt(playerId: string, choices: UpgradeOption[]) {
    this.gameState.levelingUpPlayerId = playerId;
    this.gameState.upgradePromptType = "levelUp";
    this.upgradeChoices.set(playerId, choices);
  }

  private clearUpgradePrompt(playerId: string) {
    this.gameState.levelingUpPlayerId = null;
    this.gameState.upgradePromptType = null;
    this.upgradeChoices.delete(playerId);
  }

  private startShopRound(
    state: GameState,
    pendingBossType: BossType | null = null,
    nodeRewards: RunMapReward[] = [],
  ) {
    this.resetArenaForEncounter(state);
    state.status = "playing";
    state.isShopRound = true;
    state.shopPendingBossType = pendingBossType;
    const shopModifiers = this.getShopModifiersFromRewards(nodeRewards);
    this.applyRunMapRewards(state, shopModifiers.entryRewards);
    state.shopStands = this.createShopStands(state.wave, {
      discountPercent: shopModifiers.discountPercent,
      extraStock: shopModifiers.extraStock,
    });
    state.shopPrompt =
      shopModifiers.summaryLabels.length > 0
        ? `BONUSES ${shopModifiers.summaryLabels.join(" | ")}. Move to a stand and press E to interact.`
        : "SHOP ROUND: move to a stand and press E to interact.";
    state.players.forEach((player) => {
      player.lastInteractTriggered = false;
    });

    if (!state.currentEncounterType) {
      state.currentEncounterType = "shop";
    }
  }

  private endShopRound(state: GameState) {
    const pendingBossType = state.shopPendingBossType || null;
    state.isShopRound = false;
    state.shopStands = [];
    state.shopPrompt = null;
    state.shopPendingBossType = null;

    if (pendingBossType) {
      state.wave++;
      state.waveTimer = 0;
      state.enemies = [];
      state.boss = createBoss(
        uuidv4(),
        { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
        pendingBossType,
        state.wave,
      );
      state.status = "bossFight";
      state.currentEncounterType = "boss";
    } else if (state.currentEncounterType === "shop") {
      this.enterMapSelection(state);
    }
  }

  private tryPurchaseShopStand(
    state: GameState,
    player: Player,
    stand: ShopStand,
  ) {
    const offer = stand.offer;
    if (!offer) return;

    if (offer.type === "leave") {
      state.shopPrompt = "Leaving shop...";
      this.endShopRound(state);
      return;
    }

    if (offer.purchased) {
      state.shopPrompt = "That stand is sold out.";
      return;
    }

    const coins = player.coins || 0;
    if (coins < offer.cost) {
      state.shopPrompt = `Need ${offer.cost} coins for ${offer.title}.`;
      return;
    }

    player.coins = coins - offer.cost;

    if (offer.type === "upgrade" && offer.upgradeType) {
      const option: UpgradeOption = {
        id: offer.id,
        type: offer.upgradeType,
        title: offer.title,
        description: offer.description,
        rarity: offer.rarity || "common",
        emoji: offer.emoji,
      };
      this.applyUpgradeChoice(player, option);
    } else if (offer.type === "heal") {
      player.health = Math.min(
        player.maxHealth,
        player.health + (offer.healAmount || SHOP_HEAL_AMOUNT),
      );
    } else if (offer.type === "temporary") {
      const multiplier = offer.tempDamageMultiplier || 1.25;
      const durationWaves = offer.tempDurationWaves || 2;
      player.temporaryDamageMultiplier = Math.max(
        player.temporaryDamageMultiplier || 1,
        multiplier,
      );
      player.temporaryDamageExpiresWave = Math.max(
        player.temporaryDamageExpiresWave || state.wave,
        state.wave + durationWaves,
      );
    }

    offer.purchased = true;
    state.shopPrompt = `Bought ${offer.title}.`;
  }

  private updateShopRound(state: GameState) {
    if (
      !state.isShopRound ||
      !state.shopStands ||
      state.shopStands.length === 0
    ) {
      return;
    }

    const player = state.players.find((p) => p.status === "alive");
    if (!player) return;

    const interactPressed = !!player.lastInput?.interact;
    if (interactPressed && !player.lastInteractTriggered) {
      let closestStand: ShopStand | null = null;
      let minDistance = Infinity;
      state.shopStands.forEach((stand) => {
        const dist = Math.hypot(
          stand.position.x - player.position.x,
          stand.position.y - player.position.y,
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestStand = stand;
        }
      });

      if (closestStand && minDistance <= SHOP_INTERACT_RADIUS) {
        this.tryPurchaseShopStand(state, player, closestStand);
      } else {
        state.shopPrompt = "Move closer to a shop stand.";
      }
    }
    player.lastInteractTriggered = interactPressed;
  }

  getUpgradeOptions(): UpgradeOption[] | null {
    if (!this.gameState.levelingUpPlayerId) return null;
    return this.upgradeChoices.get(this.gameState.levelingUpPlayerId) || null;
  }

  // Debug/Sandbox methods
  debugToggleSandbox(toggle: boolean) {
    this.gameState.isSandboxMode = toggle;
    if (toggle) {
      this.gameState.status = "playing"; // Ensure we're in playing state
      this.gameState.waveTimer = 0;
      this.resetCombatEncounterState(this.gameState);
    }
    this.markStateDirty();
  }

  debugSpawnEnemy(type: EnemyType) {
    const player = this.gameState.players[0];
    if (!player) return;

    // Spawn 100 units away from player in a random direction
    const angle = Math.random() * Math.PI * 2;
    const spawnX = player.position.x + Math.cos(angle) * 200;
    const spawnY = player.position.y + Math.sin(angle) * 200;

    // Clamp to arena bounds
    const clampedX = Math.max(20, Math.min(ARENA_WIDTH - 20, spawnX));
    const clampedY = Math.max(20, Math.min(ARENA_HEIGHT - 20, spawnY));

    const newEnemy = createEnemy(
      uuidv4(),
      { x: clampedX, y: clampedY },
      type,
      this.gameState.wave,
    );
    if (type === "hellhound") {
      const existingAlpha = this.gameState.enemies.find(
        (enemy) => enemy.type === "hellhound" && enemy.isPackAlpha,
      );
      if (existingAlpha) {
        newEnemy.packLeaderId = existingAlpha.id;
      } else {
        newEnemy.isPackAlpha = true;
        newEnemy.packMarkUntil = 0;
      }
    }
    this.gameState.enemies.push(newEnemy);
    this.markStateDirty();
  }

  debugSpawnBoss(type: BossType) {
    const player = this.gameState.players[0];
    if (!player) return;

    const spawnX = ARENA_WIDTH / 2;
    const spawnY = ARENA_HEIGHT / 2;

    this.gameState.status = "bossFight";
    this.gameState.boss = createBoss(
      uuidv4(),
      { x: spawnX, y: spawnY },
      type,
      this.gameState.wave,
    );
    this.triggerScreenShake(15, 500);
    this.markStateDirty();
  }

  debugGiveUpgrade(
    upgrade:
      | UpgradeType
      | Pick<UpgradeOption, "type" | "title" | "rarity" | "emoji">,
  ) {
    const player = this.gameState.players[0];
    if (!player) return;
    const type = typeof upgrade === "string" ? upgrade : upgrade.type;
    const matchingUpgrades = ALL_UPGRADES.filter((u) => u.type === type);
    const chosenVisual =
      typeof upgrade === "string"
        ? matchingUpgrades.length > 0
          ? matchingUpgrades[
              Math.floor(Math.random() * matchingUpgrades.length)
            ]
          : null
        : upgrade;

    applyUpgradeEffect(player, chosenVisual || type);

    // Track collected upgrade visually
    if (!player.collectedUpgrades) player.collectedUpgrades = [];
    const existing = player.collectedUpgrades.find((u) => u.type === type);
    if (existing) {
      existing.count++;
      if (chosenVisual) {
        existing.title = chosenVisual.title;
        existing.rarity = chosenVisual.rarity;
        existing.emoji = chosenVisual.emoji;
      }
    } else {
      player.collectedUpgrades.push({
        type: type,
        title:
          chosenVisual?.title ||
          type
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (ch) => ch.toUpperCase()),
        rarity: chosenVisual?.rarity || "legendary",
        emoji: chosenVisual?.emoji || "🧪",
        count: 1,
      });
    }

    // Special cases for certain upgrades
    if (type === "pet") {
      if (!this.gameState.pets) this.gameState.pets = [];
      const newPet: Pet = {
        id: uuidv4(),
        ownerId: player.id,
        position: { ...player.position },
        health: 50,
        maxHealth: 50,
        level: 1,
        xp: 0,
        xpToNextLevel: 10,
        damage: 5,
        attackSpeed: 800,
        attackCooldown: 0,
        emoji: "🐕",
      };
      this.gameState.pets.push(newPet);
      player.hasPet = true;
    }

    if (type === "orbital") {
      if (!this.gameState.orbitalSkulls) this.gameState.orbitalSkulls = [];
      const orbitalCount = player.orbitalCount || 1;
      const angleOffset = (Math.PI * 2) / orbitalCount;
      const newSkull: OrbitalSkull = {
        id: uuidv4(),
        ownerId: player.id,
        angle: angleOffset * (orbitalCount - 1),
        radius: 60,
        damage: 10 + player.level * 2,
      };
      this.gameState.orbitalSkulls.push(newSkull);
    }

    if (type === "turret") {
      const stacks = this.getTurretUpgradeStacks(player);
      const burstCount = Math.min(3, 2 + Math.floor(stacks / 2));
      for (let i = 0; i < burstCount; i++) {
        this.spawnTurretForPlayer(player, "toaster");
      }
    }
    this.markStateDirty();
  }

  debugTriggerBossRound() {
    this.startBossEncounter(this.gameState);
    this.markStateDirty();
  }

  debugTriggerShopRound() {
    this.gameState.currentEncounterType = "shop";
    this.startShopRound(this.gameState);
    this.markStateDirty();
  }

  debugClearEnemies() {
    this.combatSpawnQueue = [];
    this.combatSpawnCooldownMs = 0;
    this.gameState.enemies = [];
    this.gameState.projectiles = [];
    this.gameState.boss = null;
    this.gameState.hazards = [];
    this.gameState.xpOrbs = [];
    this.gameState.explosions = [];
    this.gameState.status = "playing";
    this.gameState.levelingUpPlayerId = null;
    this.gameState.upgradePromptType = null;
    this.upgradeChoices.clear();
    this.gameState.isShopRound = false;
    this.gameState.shopStands = [];
    this.gameState.shopPrompt = null;
    this.gameState.shopPendingBossType = null;
    this.gameState.currentEncounterType = null;
    this.gameState.encounterWave = 0;
    this.gameState.encounterWavesTotal = 0;
    this.gameState.encounterEnemiesRemaining = 0;
    this.gameState.encounterEnemiesTotal = 0;
    this.gameState.encounterPhase = null;
    this.gameState.encounterIntermissionMs = 0;
    this.markStateDirty();
  }

  debugSetInvulnerability(toggle: boolean) {
    const player = this.gameState.players[0];
    if (!player) return;
    player.isInvulnerable = toggle;
    if (toggle) {
      player.invulnerableUntil = Date.now() + 999999999;
    } else {
      player.invulnerableUntil = 0;
    }
    this.markStateDirty();
  }

  debugLevelUp() {
    const player = this.gameState.players[0];
    if (!player) return;
    player.xp = player.xpToNextLevel;
    // The tick will handle the actual level up
    this.markStateDirty();
  }

  private tick() {
    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;
    this.runSimulationStep(now, delta);
  }

  advanceTime(ms: number) {
    let remaining = Math.max(0, ms);
    let simulatedNow = this.lastTick || Date.now();

    while (remaining > 0) {
      const step = Math.min(TICK_RATE, remaining);
      simulatedNow += step;
      this.runSimulationStep(simulatedNow, step);
      remaining -= step;
    }

    this.lastTick = simulatedNow;
  }

  renderGameToText() {
    const state = this.gameState;
    const localPlayer = state.players[0];
    const runMap = state.runMap;
    const now = Date.now();

    return JSON.stringify({
      mode: state.status,
      mapDepth: state.mapDepth || 0,
      threatTier: state.wave || 0,
      currentEncounterType: state.currentEncounterType || null,
      currentNodeId: runMap?.currentNodeId || null,
      currentNodeRewards: this.getCurrentNodeRewards(state).map((reward) => ({
        type: reward.type,
        value: reward.value,
        label: reward.label,
        durationWaves: reward.durationWaves || null,
      })),
      reachableNodes:
        runMap?.reachableNodeIds.map((nodeId) => {
          const node = runMap.nodes.find(
            (candidate) => candidate.id === nodeId,
          );
          return node
            ? {
                id: node.id,
                routeId: node.routeId,
                depth: node.depth,
                type: node.encounterType,
                title: node.title || null,
                bossType: node.bossType || null,
                rewards: (node.rewards || []).map((reward) => ({
                  type: reward.type,
                  label: reward.label,
                  value: reward.value,
                  durationWaves: reward.durationWaves || null,
                })),
              }
            : { id: nodeId };
        }) || [],
      bossChoices:
        runMap?.nodes
          .filter((node) => node.encounterType === "boss")
          .map((node) => ({
            id: node.id,
            routeId: node.routeId,
            title: node.title || null,
            bossType: node.bossType || null,
            rewards: (node.rewards || []).map((reward) => ({
              type: reward.type,
              label: reward.label,
              value: reward.value,
            })),
          })) || [],
      player: localPlayer
        ? {
            x: Math.round(localPlayer.position.x),
            y: Math.round(localPlayer.position.y),
            health: Math.round(localPlayer.health),
            level: localPlayer.level,
            coins: Math.floor(localPlayer.coins || 0),
            voidImplosionStacks: localPlayer.voidImplosionStacks || 0,
          }
        : null,
      enemies: state.enemies.map((enemy) => ({
        type: enemy.type,
        x: Math.round(enemy.position.x),
        y: Math.round(enemy.position.y),
        health: Math.round(enemy.health),
      })),
      explosions:
        state.explosions?.map((explosion) => ({
          type: explosion.type || "normal",
          x: Math.round(explosion.position.x),
          y: Math.round(explosion.position.y),
          radius: Math.round(explosion.radius),
          remainingMs: Math.max(
            0,
            (explosion.durationMs || 500) - (now - explosion.timestamp),
          ),
        })) || [],
      isShopRound: !!state.isShopRound,
      isHellhoundRound: !!state.isHellhoundRound,
      combatEncounter:
        state.currentEncounterType === "combat"
          ? {
              wave: state.encounterWave || 0,
              totalWaves: state.encounterWavesTotal || 0,
              phase: state.encounterPhase || null,
              enemiesRemaining: state.encounterEnemiesRemaining || 0,
              enemiesTotal: state.encounterEnemiesTotal || 0,
              intermissionMs: state.encounterIntermissionMs || 0,
            }
          : null,
      hellhoundProgress: state.isHellhoundRound
        ? {
            killed: state.hellhoundsKilled || 0,
            total: state.totalHellhoundsInRound || 0,
          }
        : null,
    });
  }

  private runSimulationStep(now: number, delta: number) {
    if (delta <= 0) return;

    const state = this.gameState;
    const localPlayer = state.players[0];
    if (localPlayer) {
      localPlayer.lastInput = { ...this.inputState };
    }

    // Pause game loop if player is leveling up or explicit pause
    if (state.levelingUpPlayerId || state.isPaused) return;

    const timeFactor = delta / (1000 / 60);

    // Only update game mechanics if still playing or in boss fight
    if (state.status === "playing" || state.status === "bossFight") {
      this.updatePlayerMovement(state, timeFactor, now);
      this.updatePlayerEffects(state, delta, now);
      this.updateVampireDrain(state, delta, now);
      this.updateBlinkCooldown(state, delta);
      this.updateRevives(state, delta);
      this.updatePets(state, now, delta, timeFactor);
      this.updateOrbitalSkulls(state, now, delta);
      this.updateFireTrails(state, now, delta);
      this.updateToasterTurretDeployment(state, now);
      this.updateTurrets(state, now, delta);
      this.updateClones(state, now, delta);

      if (state.isShopRound) {
        this.updateShopRound(state);
      } else {
        if (state.status === "bossFight") {
          this.updateBoss(state, now, delta, timeFactor);
          this.updateShockwaveRings(state, delta);
          this.updateBossProjectiles(state, delta);
        } else {
          this.updateEnemyAI(state, now, delta, timeFactor);
          this.updateWaves(state, delta);
        }

        this.updatePlayerAttacks(state, delta, now);
        this.updateProjectiles(state, now, delta, timeFactor);
        this.updateStatusEffects(state, delta);
        this.updateHazards(state, now, delta);
        this.updateExplosions(state, now, timeFactor);
        this.updateChainLightning(state, now);
      }

      this.updateParticles(state, delta, now);
      this.updateScreenShake(state, now);
      this.updateAbilities(state, delta);
      this.updateXPOrbs(state, timeFactor);
      this.updateTrailSegments(state, delta, now);
      this.updateBinaryDrops(state, delta, now);
    }

    // Handle extraction in bossDefeated state
    if (state.status === "bossDefeated") {
      this.updatePlayerMovement(state, timeFactor, now);
      this.updateExtraction(state, delta);
    }

    // Always check game status to save stats when game ends
    this.updateGameStatus(state);

    // Final safety check to prevent NaN position propagation
    this.sanitizeState(state);
    this.markStateDirty();
  }

  private sanitizeState(state: GameState) {
    const sanitizeVector = (
      vector: Vector2D | undefined,
      fallbackX: number,
      fallbackY: number,
    ) => {
      if (!vector) return;
      if (!Number.isFinite(vector.x)) vector.x = fallbackX;
      if (!Number.isFinite(vector.y)) vector.y = fallbackY;
    };

    state.players.forEach((player) => {
      sanitizeVector(player.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      player.history?.forEach((point) =>
        sanitizeVector(point, player.position.x, player.position.y),
      );
      player.satelliteOrbs?.forEach((orb, index) => {
        if (!Number.isFinite(orb.angle)) orb.angle = index * (Math.PI / 2);
        if (!Number.isFinite(orb.radius)) orb.radius = 85;
      });
    });

    state.enemies.forEach((enemy) => {
      sanitizeVector(enemy.position, 0, 0);
      enemy.history?.forEach((point) =>
        sanitizeVector(point, enemy.position.x, enemy.position.y),
      );
      if (enemy.chargeDirection) {
        sanitizeVector(enemy.chargeDirection, 1, 0);
      }
    });

    state.projectiles.forEach((projectile) => {
      sanitizeVector(projectile.position, -1000, -1000);
      sanitizeVector(projectile.velocity, 0, 0);
    });

    state.xpOrbs.forEach((orb) =>
      sanitizeVector(orb.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.pets?.forEach((pet) =>
      sanitizeVector(pet.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.turrets?.forEach((turret) =>
      sanitizeVector(turret.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.clones?.forEach((clone) =>
      sanitizeVector(clone.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.hazards?.forEach((hazard) =>
      sanitizeVector(hazard.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.particles?.forEach((particle) => {
      sanitizeVector(particle.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      sanitizeVector(particle.velocity, 0, 0);
    });
    state.trailSegments?.forEach((segment) =>
      sanitizeVector(segment.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.binaryDrops?.forEach((drop) =>
      sanitizeVector(drop.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.fireTrails?.forEach((trail) =>
      sanitizeVector(trail.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.explosions?.forEach((explosion) =>
      sanitizeVector(explosion.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.chainLightning?.forEach((chain) => {
      sanitizeVector(chain.from, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      sanitizeVector(chain.to, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
    });
    state.shockwaveRings?.forEach((ring) =>
      sanitizeVector(ring.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2),
    );
    state.bossProjectiles?.forEach((projectile) => {
      sanitizeVector(projectile.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      sanitizeVector(projectile.velocity, 0, 0);
    });
    if (state.teleporter) {
      sanitizeVector(
        state.teleporter.position,
        ARENA_WIDTH / 2,
        ARENA_HEIGHT / 2,
      );
    }

    if (state.boss) {
      sanitizeVector(state.boss.position, ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
      if (state.boss.currentAttack?.targetPosition) {
        sanitizeVector(
          state.boss.currentAttack.targetPosition,
          state.boss.position.x,
          state.boss.position.y,
        );
      }
      if (state.boss.currentAttack?.direction) {
        sanitizeVector(state.boss.currentAttack.direction, 1, 0);
      }
      state.boss.portals?.forEach((portal) =>
        sanitizeVector(
          portal.position,
          state.boss!.position.x,
          state.boss!.position.y,
        ),
      );
      state.boss.shieldGenerators?.forEach((generator) =>
        sanitizeVector(
          generator.position,
          state.boss!.position.x,
          state.boss!.position.y,
        ),
      );
      state.boss.teslaBalls?.forEach((ball, index) => {
        if (!Number.isFinite(ball.angle)) {
          ball.angle =
            (Math.PI * 2 * index) /
            Math.max(1, state.boss!.teslaBalls?.length || 1);
        }
        if (!Number.isFinite(ball.radius))
          ball.radius = MAGNUS_TESLA_BALL_BASE_RADIUS;
      });
    }
  }

  private updateToasterTurretDeployment(state: GameState, now: number) {
    if (!state.turrets) state.turrets = [];

    for (const player of state.players) {
      if (player.status !== "alive") continue;
      const stacks = this.getTurretUpgradeStacks(player);
      if (stacks <= 0) continue;

      const toasterTurrets = state.turrets.filter(
        (t) => t.ownerId === player.id && t.style === "toaster",
      );
      const cap = this.getToasterTurretCap(player);
      if (toasterTurrets.length >= cap) continue;

      const lastDeployAt = this.lastToasterDeployAt.get(player.id) || 0;
      const redeployInterval = Math.max(1800, 5000 - stacks * 650);
      if (now - lastDeployAt >= redeployInterval) {
        this.spawnTurretForPlayer(player, "toaster");
      }
    }
  }

  private updatePlayerMovement(
    state: GameState,
    timeFactor: number,
    now: number,
  ) {
    state.players.forEach((p) => {
      if (p.status === "alive" && p.lastInput) {
        // Track history for trails
        if (!p.history) p.history = [];
        p.history.push({ x: p.position.x, y: p.position.y });
        if (p.history.length > 5) p.history.shift();

        let movedAnalog = false;
        let repositionSpeedMultiplier = 1;
        if (state.hazards && state.hazards.length > 0) {
          const isInsideIceZone = state.hazards.some(
            (hazard) =>
              hazard.type === "freeze-barrel" &&
              hazard.variant === "zone" &&
              hazard.zoneUntil !== undefined &&
              hazard.zoneUntil > now &&
              Math.hypot(
                p.position.x - hazard.position.x,
                p.position.y - hazard.position.y,
              ) < (hazard.radius || 140),
          );
          if (isInsideIceZone) {
            repositionSpeedMultiplier = 1.12;
          }
        }

        const facehuggerSpeedMultiplier = p.attachedBug
          ? FACEHUGGER_SLOW_MULTIPLIER
          : 1;

        if (
          p.lastInput.analogX !== undefined &&
          p.lastInput.analogY !== undefined
        ) {
          const ax = p.lastInput.analogX || 0;
          const ay = p.lastInput.analogY || 0;
          const mag = Math.hypot(ax, ay);
          if (mag > 0.1 && !isNaN(mag)) {
            // Apply analog movement
            const speed =
              (p.speed || 4) *
              repositionSpeedMultiplier *
              facehuggerSpeedMultiplier;
            const tf = isNaN(timeFactor) ? 1 : timeFactor;
            p.position.x += (ax / (mag > 1 ? mag : 1)) * speed * tf;
            p.position.y += (ay / (mag > 1 ? mag : 1)) * speed * tf;
            movedAnalog = true;
          }
        }

        if (!movedAnalog) {
          // Digital movement (keyboard or d-pad)
          const speed =
            (p.speed || 4) *
            repositionSpeedMultiplier *
            facehuggerSpeedMultiplier;
          const tf = isNaN(timeFactor) ? 1 : timeFactor;
          if (p.lastInput.up) p.position.y -= speed * tf;
          if (p.lastInput.down) p.position.y += speed * tf;
          if (p.lastInput.left) p.position.x -= speed * tf;
          if (p.lastInput.right) p.position.x += speed * tf;
        }

        // Handle one-shot triggers from online input (since they are sent via input state)
        if (p.id !== "local-player" && p.id !== state.players[0].id) {
          // Simple check if it's not local
          if (p.lastInput.blink && !p.lastBlinkTriggered) {
            this.handleBlinkForPlayer(p);
            p.lastBlinkTriggered = true;
          } else if (!p.lastInput.blink) {
            p.lastBlinkTriggered = false;
          }
          if (p.lastInput.ability && !p.lastAbilityTriggered) {
            this.handleAbilityForPlayer(p);
            p.lastAbilityTriggered = true;
          } else if (!p.lastInput.ability) {
            p.lastAbilityTriggered = false;
          }
        }

        // Screen Wrap
        if (p.hasScreenWrap) {
          if (p.position.x < 0) p.position.x = ARENA_WIDTH;
          if (p.position.x > ARENA_WIDTH) p.position.x = 0;
          if (p.position.y < 0) p.position.y = ARENA_HEIGHT;
          if (p.position.y > ARENA_HEIGHT) p.position.y = 0;
        } else {
          p.position.x = Math.max(15, Math.min(ARENA_WIDTH - 15, p.position.x));
          p.position.y = Math.max(
            15,
            Math.min(ARENA_HEIGHT - 15, p.position.y),
          );
        }

        // Neon Trail spawn
        if (p.hasNeonTrail) {
          if (!p.lastTrailTimestamp || now - p.lastTrailTimestamp > 100) {
            if (!state.trailSegments) state.trailSegments = [];
            state.trailSegments.push({
              id: uuidv4(),
              position: { ...p.position },
              timestamp: now,
              color: p.color || "#00FFFF",
              ownerId: p.id,
            });
            p.lastTrailTimestamp = now;
          }
        }
      }
    });
  }

  private updatePlayerEffects(state: GameState, delta: number, now: number) {
    state.players.forEach((p) => {
      if (p.status !== "alive") return;

      if (p.attachedBug) {
        const shakePressed = !!p.lastInput?.shake;
        if (shakePressed && !p.wasShakePressed) {
          p.attachedBug.shakes += 1;
          this.triggerScreenShake(2, 90);
          this.spawnParticles(p.position, "#FF66CC", 4, "glitch", 4);
        }
        p.wasShakePressed = shakePressed;

        if (p.attachedBug.shakes >= p.attachedBug.requiredShakes) {
          p.attachedBug = undefined;
          p.wasShakePressed = false;
          this.triggerScreenShake(6, 220);
          this.spawnParticles(p.position, "#FF99EE", 24, "glitch", 12);
        }
      } else {
        p.wasShakePressed = false;
      }

      if (p.status !== "alive") return;

      // Regeneration
      if (p.regeneration && p.regeneration > 0) {
        p.health = Math.min(
          p.maxHealth,
          p.health + (p.regeneration * delta) / 1000,
        );
      }

      // Invulnerability expiry
      if (
        p.isInvulnerable &&
        p.invulnerableUntil &&
        now >= p.invulnerableUntil
      ) {
        p.isInvulnerable = false;
      }
      // Shield recharge (slowly)
      if (p.maxShield && p.maxShield > 0) {
        if (!p.shield) p.shield = 0;
        p.shield = Math.min(p.maxShield, p.shield + (10 * delta) / 1000);
      }

      // Expire temporary shop buffs by wave progression.
      if (
        p.temporaryDamageMultiplier &&
        p.temporaryDamageMultiplier > 1 &&
        p.temporaryDamageExpiresWave !== undefined &&
        state.wave > p.temporaryDamageExpiresWave
      ) {
        p.temporaryDamageMultiplier = 1;
        p.temporaryDamageExpiresWave = undefined;
      }

      // Static Field
      if (p.staticFieldTimer !== undefined) {
        p.staticFieldTimer += delta;
        if (p.staticFieldTimer >= 2000) {
          // Every 2 seconds
          p.staticFieldTimer = 0;
          const nearest = state.enemies.reduce(
            (closest, enemy) => {
              const dist = Math.hypot(
                enemy.position.x - p.position.x,
                enemy.position.y - p.position.y,
              );
              return dist < closest.dist ? { enemy, dist } : closest;
            },
            { enemy: null as Enemy | null, dist: 300 },
          ).enemy;

          if (nearest) {
            nearest.health -= 20 + p.level * 2;
            this.markEnemyDamagedBySource(state, nearest, p.id);
            if (!state.chainLightning) state.chainLightning = [];
            state.chainLightning.push({
              id: uuidv4(),
              from: { ...p.position },
              to: { ...nearest.position },
              timestamp: now,
            });
          }
        }
      }

      // Satellite Ring Orbit
      if (p.hasSatelliteRing && p.satelliteOrbs) {
        p.satelliteOrbs.forEach((orb) => {
          orb.angle += (1.5 * delta) / 1000;
          const ox = p.position.x + Math.cos(orb.angle) * orb.radius;
          const oy = p.position.y + Math.sin(orb.angle) * orb.radius;

          // Collision with enemies
          state.enemies.forEach((enemy) => {
            if (Math.hypot(enemy.position.x - ox, enemy.position.y - oy) < 20) {
              enemy.health -= 15 + p.level;
              this.markEnemyDamagedBySource(state, enemy, p.id);
              enemy.lastHitTimestamp = now;
              this.spawnParticles({ x: ox, y: oy }, orb.color, 5, "pixel", 5);
            }
          });
        });
      }
    });
  }

  private updateVampireDrain(state: GameState, delta: number, now: number) {
    state.players.forEach((p) => {
      if (p.status !== "alive" || p.characterType !== "vampire-vex") return;

      // Drain radius grows with level: base 50 + (level * 10)
      const drainRadius = 50 + p.level * 10;
      p.vampireDrainRadius = drainRadius;

      // Drain damage per second: 2 + (level * 0.5)
      const drainDPS = 2 + p.level * 0.5;
      const drainDamage = drainDPS * (delta / 1000);

      let totalDrained = 0;
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - p.position.x,
          enemy.position.y - p.position.y,
        );
        if (dist <= drainRadius) {
          const actualDamage = Math.min(drainDamage, enemy.health);
          enemy.health -= actualDamage;
          this.markEnemyDamagedBySource(state, enemy, p.id);
          totalDrained += actualDamage;
          enemy.lastHitTimestamp = now;
        }
      });

      // Heal player for 100% of drained health
      if (totalDrained > 0) {
        p.health = Math.min(p.maxHealth, p.health + totalDrained);
        p.lastHealedTimestamp = now;
      }
    });
  }

  private updateBlinkCooldown(state: GameState, delta: number) {
    state.players.forEach((p) => {
      if (p.characterType !== "dash-dynamo") return;

      if (p.blinkCooldown !== undefined && p.blinkCooldown > 0) {
        p.blinkCooldown -= delta;
        if (p.blinkCooldown <= 0) {
          p.blinkCooldown = 0;
          p.blinkReady = true;
        }
      }
    });
  }

  private updateTurrets(state: GameState, now: number, delta: number) {
    if (!state.turrets) state.turrets = [];

    // Remove expired turrets
    state.turrets = state.turrets.filter((turret) => {
      if (now >= turret.expiresAt) return false;
      if (turret.health <= 0) return false;
      return true;
    });

    // Update turret attacks
    state.turrets.forEach((turret) => {
      turret.attackCooldown -= delta;
      // Check if there are enemies or a boss to attack
      const hasTargets = state.enemies.length > 0 || state.boss !== null;
      if (turret.attackCooldown <= 0 && hasTargets) {
        // Get owner player to inherit their stats
        const owner = state.players.find((p) => p.id === turret.ownerId);
        if (!owner) return;
        const ownerDamageMultiplier = this.getDamageMultiplierForPlayer(
          owner,
          state,
        );

        turret.attackCooldown = turret.attackSpeed;

        // Collect all possible targets (enemies and boss)
        const allTargets: Array<{ position: { x: number; y: number } }> = [
          ...state.enemies,
        ];
        if (state.boss) {
          allTargets.push(state.boss);
        }

        // Find closest target in range
        const targetsInRange = allTargets.filter((target) => {
          const dist = Math.hypot(
            target.position.x - turret.position.x,
            target.position.y - turret.position.y,
          );
          return dist <= turret.range;
        });

        if (targetsInRange.length > 0) {
          const target = targetsInRange[0];
          const baseAngle = Math.atan2(
            target.position.y - turret.position.y,
            target.position.x - turret.position.x,
          );

          // Inherit player's multishot
          const shots = Math.max(1, owner.projectilesPerShot || 1);
          const spread = (10 * Math.PI) / 180; // Same spread as player

          for (let i = 0; i < shots; i++) {
            const offset = (i - (shots - 1) / 2) * spread;
            const angle = baseAngle + offset;

            // Inherit player's crit chance and calculate crit
            const isCrit = Math.random() < (owner.critChance || 0);
            const baseDamage =
              (turret.damage + (owner.projectileDamage - 8)) *
              ownerDamageMultiplier; // Add player's bonus damage
            const finalDamage = Math.round(
              baseDamage * (isCrit ? owner.critMultiplier || 2 : 1),
            );

            const projectile: Projectile = {
              id: uuidv4(),
              ownerId: turret.ownerId,
              position: { ...turret.position },
              velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
              damage: finalDamage,
              isCrit,
              kind: turret.style === "toaster" ? "toast" : "bullet",
              radius: 5,
              hitEnemies: [],
              pierceRemaining: owner.pierceCount || 0, // Inherit pierce
              ricochetRemaining: owner.ricochetCount || 0, // Inherit ricochet
            };
            state.projectiles.push(projectile);
          }
        }
      }
    });
  }

  private updateClones(state: GameState, now: number, delta: number) {
    if (!state.clones) state.clones = [];

    const CLONE_DURATION = 4000; // 4 seconds lifetime
    const CLONE_FADE_IN_DURATION = 300; // 300ms fade in
    const CLONE_FADE_OUT_DURATION = 500; // 500ms fade out before expiring
    const CLONE_SPAWN_COOLDOWN_BASE = 2000; // 2 seconds base cooldown
    const CLONE_COOLDOWN_REDUCTION = 500; // -0.5s per stack

    // Spawn clones for players with clone upgrade
    state.players.forEach((player) => {
      if (
        player.status !== "alive" ||
        !player.cloneCount ||
        player.cloneCount <= 0
      )
        return;

      // Check if player is moving
      const isMoving =
        player.lastInput &&
        (player.lastInput.up ||
          player.lastInput.down ||
          player.lastInput.left ||
          player.lastInput.right);

      if (!isMoving) return;

      // Calculate spawn cooldown based on stacks
      const spawnCooldown = Math.max(
        500, // Minimum 0.5s cooldown
        CLONE_SPAWN_COOLDOWN_BASE -
          (player.cloneCount - 1) * CLONE_COOLDOWN_REDUCTION,
      );

      // Check if enough time has passed since last spawn
      if (
        !player.lastCloneSpawnTime ||
        now - player.lastCloneSpawnTime >= spawnCooldown
      ) {
        // Spawn a new clone at player's current position
        const newClone: Clone = {
          id: uuidv4(),
          ownerId: player.id,
          position: { x: player.position.x, y: player.position.y },
          damage: 0.3, // 30% of player's damage
          attackSpeed: player.attackSpeed * 1.5, // Slightly slower than player
          attackCooldown: 0,
          range: 400, // Attack range
          expiresAt: now + CLONE_DURATION,
          opacity: 0, // Start invisible for fade-in
        };
        state.clones.push(newClone);
        player.lastCloneSpawnTime = now;
      }
    });

    // Update existing clones
    state.clones = state.clones.filter((clone) => {
      // Remove expired clones
      if (now >= clone.expiresAt) return false;

      // Check if owner still exists
      const owner = state.players.find((p) => p.id === clone.ownerId);
      if (!owner || owner.status === "dead") return false;

      // Update opacity for fade-in/fade-out
      const age = now - (clone.expiresAt - CLONE_DURATION);
      const timeUntilExpire = clone.expiresAt - now;

      if (age < CLONE_FADE_IN_DURATION) {
        // Fade in
        clone.opacity = age / CLONE_FADE_IN_DURATION;
      } else if (timeUntilExpire < CLONE_FADE_OUT_DURATION) {
        // Fade out
        clone.opacity = timeUntilExpire / CLONE_FADE_OUT_DURATION;
      } else {
        // Fully visible
        clone.opacity = 1;
      }

      // Update attack cooldown
      clone.attackCooldown -= delta;

      // Check if there are enemies or a boss to attack
      const hasTargets = state.enemies.length > 0 || state.boss !== null;
      if (clone.attackCooldown <= 0 && hasTargets) {
        clone.attackCooldown = clone.attackSpeed;

        // Collect all possible targets (enemies and boss)
        const allTargets: Array<{ position: { x: number; y: number } }> = [
          ...state.enemies,
        ];
        if (state.boss) {
          allTargets.push(state.boss);
        }

        // Find closest target in range
        const targetsInRange = allTargets.filter((target) => {
          const dist = Math.hypot(
            target.position.x - clone.position.x,
            target.position.y - clone.position.y,
          );
          return dist <= clone.range;
        });

        if (targetsInRange.length > 0) {
          const target = targetsInRange[0];
          const angle = Math.atan2(
            target.position.y - clone.position.y,
            target.position.x - clone.position.x,
          );

          // Clone fires a single projectile (no multishot)
          const ownerDamageMultiplier = this.getDamageMultiplierForPlayer(
            owner,
            state,
          );
          const baseDamage = Math.round(
            owner.projectileDamage * ownerDamageMultiplier * clone.damage,
          );

          const projectile: Projectile = {
            id: uuidv4(),
            ownerId: clone.ownerId, // Credit kills to owner
            position: { ...clone.position },
            velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
            damage: baseDamage,
            isCrit: false, // Clones don't crit
            kind: "bullet",
            radius: 5,
            hitEnemies: [],
            pierceRemaining: 0, // Clones don't inherit pierce
            ricochetRemaining: 0, // Clones don't inherit ricochet
          };
          state.projectiles.push(projectile);
        }
      }

      return true;
    });
  }

  private updateRevives(state: GameState, delta: number) {
    const alivePlayers = state.players.filter((p) => p.status === "alive");
    const deadPlayers = state.players.filter((p) => p.status === "dead");
    deadPlayers.forEach((deadPlayer) => {
      const reviver = alivePlayers.find(
        (p) =>
          Math.hypot(
            p.position.x - deadPlayer.position.x,
            p.position.y - deadPlayer.position.y,
          ) < 50,
      );
      if (reviver) {
        deadPlayer.reviveProgress += delta;
        if (deadPlayer.reviveProgress >= REVIVE_DURATION) {
          deadPlayer.status = "alive";
          deadPlayer.health = deadPlayer.maxHealth / 2;
          deadPlayer.reviveProgress = 0;
        }
      } else {
        deadPlayer.reviveProgress = 0;
      }
    });
  }

  private updatePets(
    state: GameState,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    if (!state.pets) return;

    state.pets = state.pets.filter((pet) => {
      const owner = state.players.find((p) => p.id === pet.ownerId);
      if (!owner || owner.status === "dead") return false;

      const followDistance = 40;
      const dx = owner.position.x - pet.position.x;
      const dy = owner.position.y - pet.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist > followDistance) {
        const speed = 3 * timeFactor;
        pet.position.x += (dx / dist) * speed;
        pet.position.y += (dy / dist) * speed;
      }

      pet.attackCooldown -= delta;
      if (pet.attackCooldown <= 0 && state.enemies.length > 0) {
        const nearestEnemy = state.enemies.reduce(
          (closest, enemy) => {
            const d = Math.hypot(
              enemy.position.x - pet.position.x,
              enemy.position.y - pet.position.y,
            );
            return d < closest.dist ? { enemy, dist: d } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity },
        );

        if (nearestEnemy.enemy && nearestEnemy.dist < 400) {
          pet.attackCooldown = pet.attackSpeed;
          const angle = Math.atan2(
            nearestEnemy.enemy.position.y - pet.position.y,
            nearestEnemy.enemy.position.x - pet.position.x,
          );
          const petProjectile: Projectile = {
            id: uuidv4(),
            ownerId: pet.id,
            position: { ...pet.position },
            velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
            damage: pet.damage,
            isCrit: false,
            kind: "bullet",
            radius: 4,
            hitEnemies: [],
            pierceRemaining: 0,
            ricochetRemaining: 0,
          };
          state.projectiles.push(petProjectile);
        }
      }

      if (pet.level < owner.level) {
        pet.level = owner.level;
        pet.maxHealth += 10;
        pet.health = pet.maxHealth;
        pet.damage += 2;
        pet.attackSpeed = Math.max(400, pet.attackSpeed * 0.95);
      }

      return pet.health > 0;
    });
  }

  private getEnemyEffectiveSpeed(state: GameState, enemy: Enemy, now: number) {
    let effectiveSpeed = enemy.speed;

    if (enemy.supportBuffUntil && enemy.supportBuffUntil > now) {
      effectiveSpeed *= 1.22;
    }

    if (enemy.statusEffects && enemy.statusEffects.length > 0) {
      const slowEffect = enemy.statusEffects.find(
        (effect) => effect.type === "frozen" || effect.type === "slowed",
      );
      if (slowEffect?.slowAmount) {
        effectiveSpeed *= slowEffect.slowAmount;
      }
    }

    const hasTimeWarpPlayer = state.players.some(
      (player) => player.hasTimeWarp,
    );
    if (hasTimeWarpPlayer) {
      effectiveSpeed *= 0.7;
    }

    return effectiveSpeed;
  }

  private moveEnemyAlong(
    enemy: Enemy,
    direction: Vector2D,
    speed: number,
    timeFactor: number,
  ) {
    const magnitude = Math.hypot(direction.x, direction.y);
    if (magnitude <= 0.0001) return;

    if (!enemy.history) enemy.history = [];
    enemy.history.push({ x: enemy.position.x, y: enemy.position.y });
    if (enemy.history.length > 5) enemy.history.shift();

    enemy.position.x += (direction.x / magnitude) * speed * timeFactor;
    enemy.position.y += (direction.y / magnitude) * speed * timeFactor;
    enemy.position.x = Math.max(
      18,
      Math.min(ARENA_WIDTH - 18, enemy.position.x),
    );
    enemy.position.y = Math.max(
      18,
      Math.min(ARENA_HEIGHT - 18, enemy.position.y),
    );
  }

  private pushPlayer(player: Player, direction: Vector2D, distance: number) {
    const magnitude = Math.hypot(direction.x, direction.y) || 1;
    player.position.x += (direction.x / magnitude) * distance;
    player.position.y += (direction.y / magnitude) * distance;
    player.position.x = Math.max(
      20,
      Math.min(ARENA_WIDTH - 20, player.position.x),
    );
    player.position.y = Math.max(
      20,
      Math.min(ARENA_HEIGHT - 20, player.position.y),
    );
  }

  private spawnNeonPulseZone(
    state: GameState,
    position: Vector2D,
    now: number,
    radius: number,
    damage: number,
  ) {
    if (!state.hazards) state.hazards = [];
    state.hazards.push({
      id: uuidv4(),
      position: { ...position },
      type: "pulse-zone",
      variant: "zone",
      health: 9999,
      maxHealth: 9999,
      radius,
      damage,
      isActive: true,
      activationRadius: 0,
      activationThreshold: 0,
      activationCharge: 0,
      zoneUntil: now + NEON_PULSE_ZONE_DURATION_MS,
      lastToggle: now,
    });
  }

  private detonateBomber(state: GameState, enemy: Enemy, now: number) {
    const radius = enemy.explodeRadius || BOMBER_EXPLOSION_RADIUS;
    const damage = enemy.damage * 1.25;

    if (!state.explosions) state.explosions = [];
    state.explosions.push({
      id: uuidv4(),
      position: { ...enemy.position },
      radius,
      timestamp: now,
      damage,
      ownerId: enemy.id,
    });

    state.players.forEach((player) => {
      if (player.status !== "alive") return;
      const dx = player.position.x - enemy.position.x;
      const dy = player.position.y - enemy.position.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist >= radius) return;
      const falloff = 0.55 + 0.45 * (1 - dist / radius);
      this.damagePlayer(player, damage * falloff, now);
      this.pushPlayer(player, { x: dx, y: dy }, BOMBER_KNOCKBACK * falloff);
    });

    this.spawnParticles(enemy.position, "#FF7A3C", 24, "glitch", 14);
    this.triggerScreenShake(12, 220);
    enemy.health = 0;
    enemy.lastHitTimestamp = now;
  }

  private getCombatEnemyCap(state: GameState): number {
    const averagePlayerLevel = this.getAveragePlayerLevel(state);
    return Math.max(
      6,
      Math.min(
        16,
        Math.round(
          COMBAT_PACK_ENEMY_CAP_BASE +
            state.wave * COMBAT_PACK_ENEMY_CAP_WAVE_SCALAR +
            averagePlayerLevel * COMBAT_PACK_ENEMY_CAP_LEVEL_SCALAR,
        ),
      ),
    );
  }

  private getPackSpawnOrigin(side: 0 | 1 | 2 | 3) {
    if (side === 0) {
      return {
        anchor: { x: 140 + Math.random() * (ARENA_WIDTH - 280), y: -34 },
        normal: { x: 0, y: 1 },
      };
    }

    if (side === 1) {
      return {
        anchor: { x: 140 + Math.random() * (ARENA_WIDTH - 280), y: ARENA_HEIGHT + 34 },
        normal: { x: 0, y: -1 },
      };
    }

    if (side === 2) {
      return {
        anchor: { x: -34, y: 120 + Math.random() * (ARENA_HEIGHT - 240) },
        normal: { x: 1, y: 0 },
      };
    }

    return {
      anchor: { x: ARENA_WIDTH + 34, y: 120 + Math.random() * (ARENA_HEIGHT - 240) },
      normal: { x: -1, y: 0 },
    };
  }

  private getCombatPackOffset(
    formation: CombatPackFormation,
    index: number,
    total: number,
    normal: Vector2D,
  ) {
    const tangent = { x: -normal.y, y: normal.x };
    const centeredIndex = index - (total - 1) / 2;

    if (formation === "line") {
      return {
        x: tangent.x * centeredIndex * 44 - normal.x * Math.abs(centeredIndex) * 16,
        y: tangent.y * centeredIndex * 44 - normal.y * Math.abs(centeredIndex) * 16,
      };
    }

    if (formation === "staggered") {
      const row = Math.floor(index / 2);
      const lane = index % 2 === 0 ? -1 : 1;
      return {
        x: tangent.x * lane * (30 + row * 18) - normal.x * row * 28,
        y: tangent.y * lane * (30 + row * 18) - normal.y * row * 28,
      };
    }

    const angle = total <= 1 ? 0 : (index / (total - 1) - 0.5) * Math.PI * 0.9;
    const radius = 22 + total * 8;
    return {
      x: tangent.x * Math.sin(angle) * radius - normal.x * Math.cos(angle) * radius * 0.5,
      y: tangent.y * Math.sin(angle) * radius - normal.y * Math.cos(angle) * radius * 0.5,
    };
  }

  private spawnCombatPack(state: GameState, pack: CombatSpawnPack) {
    const { anchor, normal } = this.getPackSpawnOrigin(pack.side);
    pack.enemies.forEach((enemyType, index) => {
      const offset = this.getCombatPackOffset(
        pack.formation,
        index,
        pack.enemies.length,
        normal,
      );
      const spawnPosition = {
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
      };
      const enemy = createEnemy(uuidv4(), spawnPosition, enemyType, state.wave);
      state.enemies.push(enemy);
    });
  }

  private updateEnemyAI(
    state: GameState,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    if (state.isShopRound) return;

    const isHellhoundRound = state.isHellhoundRound || false;

    if (isHellhoundRound) {
      // Check if all normal enemies are dead
      const normalEnemies = state.enemies.filter((e) => e.type !== "hellhound");
      const allNormalEnemiesDead = normalEnemies.length === 0;

      // Only spawn hellhounds after all normal enemies are dead
      if (allNormalEnemiesDead && !state.isSandboxMode) {
        const totalHellhounds = state.totalHellhoundsInRound || 0;
        const hellhoundsKilled = state.hellhoundsKilled || 0;
        const currentHellhounds = state.enemies.filter(
          (e) => e.type === "hellhound",
        ).length;
        const hellhoundsSpawned = currentHellhounds + hellhoundsKilled;

        if (state.hellhoundSpawnTimer === undefined) {
          state.hellhoundSpawnTimer = 0;
        }

        state.hellhoundSpawnTimer -= delta;

        if (
          state.hellhoundSpawnTimer <= 0 &&
          hellhoundsSpawned < totalHellhounds
        ) {
          const packSize = Math.min(
            Math.floor(Math.random() * 3) + 3,
            totalHellhounds - hellhoundsSpawned,
          );

          const side = Math.floor(Math.random() * 4);
          let alphaId: string | null = null;

          for (let i = 0; i < packSize; i++) {
            let spawnX, spawnY;

            if (side === 0) {
              spawnX = Math.random() * ARENA_WIDTH;
              spawnY = -20 - Math.random() * 30;
            } else if (side === 1) {
              spawnX = Math.random() * ARENA_WIDTH;
              spawnY = ARENA_HEIGHT + 20 + Math.random() * 30;
            } else if (side === 2) {
              spawnX = -20 - Math.random() * 30;
              spawnY = Math.random() * ARENA_HEIGHT;
            } else {
              spawnX = ARENA_WIDTH + 20 + Math.random() * 30;
              spawnY = Math.random() * ARENA_HEIGHT;
            }

            const newHellhound = createEnemy(
              uuidv4(),
              { x: spawnX, y: spawnY },
              "hellhound",
              state.wave,
            );
            if (i === 0) {
              newHellhound.isPackAlpha = true;
              newHellhound.packMarkUntil = 0;
              alphaId = newHellhound.id;
            } else if (alphaId) {
              newHellhound.packLeaderId = alphaId;
            }
            state.enemies.push(newHellhound);
          }

          state.hellhoundSpawnTimer = 3000 + Math.random() * 2000;
        }
      }
    }

    const attachedSpiderIds = new Set<string>();
    const hellhoundLeaders = new Map(
      state.enemies
        .filter((enemy) => enemy.type === "hellhound" && enemy.isPackAlpha)
        .map((enemy) => [enemy.id, enemy] as const),
    );

    state.enemies.forEach((enemy) => {
      const alivePlayers = state.players.filter(
        (player) => player.status === "alive",
      );
      if (alivePlayers.length === 0) return;

      const closestPlayer = alivePlayers.reduce(
        (closest, player) => {
          const dist = Math.hypot(
            enemy.position.x - player.position.x,
            enemy.position.y - player.position.y,
          );
          return dist < closest.dist ? { player, dist } : closest;
        },
        { player: null as Player | null, dist: Infinity },
      );
      if (!closestPlayer.player) return;

      let targetPlayer = closestPlayer.player;
      let targetPosition = { ...targetPlayer.position };
      let targetDistance = closestPlayer.dist;
      let effectiveSpeed = this.getEnemyEffectiveSpeed(state, enemy, now);

      if (enemy.type === "hellhound" && enemy.isPackAlpha) {
        enemy.packMarkPlayerId = targetPlayer.id;
        enemy.packMarkUntil = now + 250;
        effectiveSpeed *= 1.08;
      } else if (enemy.type === "hellhound" && enemy.packLeaderId) {
        const leader = hellhoundLeaders.get(enemy.packLeaderId);
        if (
          leader &&
          leader.health > 0 &&
          leader.packMarkPlayerId &&
          (leader.packMarkUntil || 0) > now
        ) {
          const markedPlayer = state.players.find(
            (player) =>
              player.id === leader.packMarkPlayerId &&
              player.status === "alive",
          );
          if (markedPlayer) {
            targetPlayer = markedPlayer;
            const angleSeed = ((hashString(enemy.id) % 360) * Math.PI) / 180;
            const packAngle = angleSeed + now / 1200;
            targetPosition = {
              x:
                markedPlayer.position.x +
                Math.cos(packAngle) * HELLHOUND_PACK_OFFSET_RADIUS,
              y:
                markedPlayer.position.y +
                Math.sin(packAngle) * HELLHOUND_PACK_OFFSET_RADIUS,
            };
            targetDistance = Math.hypot(
              enemy.position.x - targetPosition.x,
              enemy.position.y - targetPosition.y,
            );
            if (
              Math.hypot(
                enemy.position.x - leader.position.x,
                enemy.position.y - leader.position.y,
              ) < HELLHOUND_PACK_RADIUS
            ) {
              effectiveSpeed *= HELLHOUND_PACK_BOOST;
            }
          }
        }
      }

      if (enemy.type === "leech-beacon") {
        enemy.supportCooldown = (enemy.supportCooldown ?? 0) - delta;
        if ((enemy.supportCooldown ?? 0) <= 0) {
          const supportRadius =
            enemy.supportRadius || LEECH_BEACON_SUPPORT_RADIUS;
          const targets = state.enemies
            .filter(
              (candidate) =>
                candidate.id !== enemy.id &&
                candidate.type !== "leech-beacon" &&
                candidate.health > 0 &&
                Math.hypot(
                  candidate.position.x - enemy.position.x,
                  candidate.position.y - enemy.position.y,
                ) < supportRadius,
            )
            .sort((a, b) => a.health / a.maxHealth - b.health / b.maxHealth)
            .slice(0, 3);

          enemy.supportTargetIds = targets.map((target) => target.id);
          enemy.supportLinkUntil = targets.length > 0 ? now + 850 : undefined;

          targets.forEach((target) => {
            target.health = Math.min(
              target.maxHealth,
              target.health +
                Math.min(LEECH_BEACON_SUPPORT_HEAL, target.maxHealth * 0.18),
            );
            target.supportBuffUntil = now + LEECH_BEACON_SUPPORT_DURATION_MS;
            target.lastHitTimestamp = now;
          });

          enemy.supportCooldown = 2600 + Math.random() * 700;
        }
      }

      if (enemy.type === "bomber") {
        if (enemy.explodeTelegraphUntil && now >= enemy.explodeTelegraphUntil) {
          this.detonateBomber(state, enemy, now);
          return;
        }

        if (!enemy.explodeTelegraphUntil && closestPlayer.dist < 115) {
          enemy.explodeTelegraphUntil = now + BOMBER_TELEGRAPH_MS;
          return;
        }
      }

      if (enemy.type === "neon-pulse") {
        enemy.pulseCooldown = (enemy.pulseCooldown ?? 0) - delta;
        if (enemy.pulseTelegraphUntil && now >= enemy.pulseTelegraphUntil) {
          const pulseRadius = enemy.pulseRadius || 155;
          state.players.forEach((player) => {
            if (player.status !== "alive") return;
            const dist = Math.hypot(
              player.position.x - enemy.position.x,
              player.position.y - enemy.position.y,
            );
            if (dist < pulseRadius * 0.9) {
              this.damagePlayer(player, enemy.damage * 0.9, now);
            }
          });
          this.spawnNeonPulseZone(
            state,
            enemy.position,
            now,
            pulseRadius + 22,
            NEON_PULSE_ZONE_DAMAGE,
          );
          this.spawnParticles(enemy.position, "#00FFFF", 18, "glitch", 12);
          this.triggerScreenShake(8, 180);
          enemy.pulseTelegraphUntil = undefined;
        } else if (
          !enemy.pulseTelegraphUntil &&
          (enemy.pulseCooldown ?? 0) <= 0 &&
          closestPlayer.dist < (enemy.pulseRadius || 155) + 140
        ) {
          enemy.pulseTelegraphUntil = now + NEON_PULSE_TELEGRAPH_MS;
          enemy.pulseCooldown = 2600 + Math.random() * 900;
        }
      }

      if (enemy.type === "tank-bot") {
        if (enemy.chargeTelegraphUntil && now >= enemy.chargeTelegraphUntil) {
          enemy.chargeTelegraphUntil = undefined;
          enemy.chargeUntil = now + TANK_BOT_CHARGE_DURATION_MS;
          enemy.chargeHitPlayerIds = [];
        }

        if (enemy.chargeUntil && enemy.chargeDirection) {
          if (now < enemy.chargeUntil) {
            this.moveEnemyAlong(
              enemy,
              enemy.chargeDirection,
              Math.max(TANK_BOT_CHARGE_SPEED, effectiveSpeed * 3.4),
              timeFactor,
            );
            alivePlayers.forEach((player) => {
              if (enemy.chargeHitPlayerIds?.includes(player.id)) return;
              const dist = Math.hypot(
                enemy.position.x - player.position.x,
                enemy.position.y - player.position.y,
              );
              if (dist >= 28) return;
              this.damagePlayer(player, enemy.damage * 1.4, now);
              this.pushPlayer(
                player,
                enemy.chargeDirection!,
                TANK_BOT_CHARGE_KNOCKBACK,
              );
              if (!enemy.chargeHitPlayerIds) enemy.chargeHitPlayerIds = [];
              enemy.chargeHitPlayerIds.push(player.id);
              this.triggerScreenShake(10, 150);
            });
            return;
          }

          enemy.chargeUntil = undefined;
          enemy.chargeDirection = undefined;
          enemy.chargeHitPlayerIds = undefined;
        }

        enemy.chargeCooldown = (enemy.chargeCooldown ?? 0) - delta;
        if (
          !enemy.chargeTelegraphUntil &&
          !enemy.chargeUntil &&
          (enemy.chargeCooldown ?? 0) <= 0 &&
          targetDistance > 95 &&
          targetDistance < 300
        ) {
          const dx = targetPosition.x - enemy.position.x;
          const dy = targetPosition.y - enemy.position.y;
          const magnitude = Math.hypot(dx, dy) || 1;
          enemy.chargeDirection = {
            x: dx / magnitude,
            y: dy / magnitude,
          };
          enemy.chargeTelegraphUntil = now + TANK_BOT_CHARGE_TELEGRAPH_MS;
          enemy.chargeCooldown = 3000 + Math.random() * 1200;
          return;
        }
      }

      if (enemy.attackSpeed && enemy.attackCooldown !== undefined) {
        enemy.attackCooldown -= delta;
        if (enemy.attackCooldown <= 0 && closestPlayer.dist < 400) {
          enemy.attackCooldown = enemy.attackSpeed;
          const angle = Math.atan2(
            targetPlayer.position.y - enemy.position.y,
            targetPlayer.position.x - enemy.position.x,
          );
          const enemyProjectile: Projectile = {
            id: uuidv4(),
            ownerId: enemy.id,
            position: { ...enemy.position },
            velocity: {
              x: Math.cos(angle) * (enemy.projectileSpeed || 4),
              y: Math.sin(angle) * (enemy.projectileSpeed || 4),
            },
            damage: enemy.damage,
            isCrit: false,
            kind: "bullet",
            radius: 6,
            hitEnemies: [],
            pierceRemaining: 0,
            ricochetRemaining: 0,
          };
          state.projectiles.push(enemyProjectile);
        }
      }

      if (closestPlayer.dist < 20) {
        if (enemy.type === "glitch-spider" && !targetPlayer.attachedBug) {
          targetPlayer.attachedBug = {
            shakes: 0,
            requiredShakes: FACEHUGGER_REQUIRED_SHAKES,
          };
          targetPlayer.wasShakePressed = false;
          attachedSpiderIds.add(enemy.id);
          this.spawnParticles(
            targetPlayer.position,
            "#FF55CC",
            18,
            "glitch",
            10,
          );
          this.triggerScreenShake(5, 220);
          return;
        }

        let incomingDamage = enemy.damage * (delta / 1000);
        if (targetPlayer.dodge && Math.random() < targetPlayer.dodge) {
          incomingDamage = 0;
        } else {
          if (targetPlayer.armor && targetPlayer.armor > 0) {
            incomingDamage *= 1 - targetPlayer.armor;
          }
          if (targetPlayer.shield && targetPlayer.shield > 0) {
            const absorbed = Math.min(targetPlayer.shield, incomingDamage);
            targetPlayer.shield -= absorbed;
            incomingDamage -= absorbed;
          }
          if (targetPlayer.thorns && targetPlayer.thorns > 0) {
            enemy.health -= incomingDamage * targetPlayer.thorns;
          }
        }

        this.damagePlayer(targetPlayer, incomingDamage, now);
        return;
      }

      if (
        (enemy.type === "tank-bot" && enemy.chargeTelegraphUntil) ||
        (enemy.type === "bomber" && enemy.explodeTelegraphUntil)
      ) {
        return;
      }

      const dx = targetPosition.x - enemy.position.x;
      const dy = targetPosition.y - enemy.position.y;
      const distanceToTarget = Math.hypot(dx, dy) || 1;

      if (
        enemy.type === "slugger" ||
        enemy.type === "neon-pulse" ||
        enemy.type === "leech-beacon" ||
        enemy.type === "orbit-drone"
      ) {
        if (
          enemy.nextStrafeSwapAt === undefined ||
          now >= enemy.nextStrafeSwapAt
        ) {
          enemy.strafeDirection = enemy.strafeDirection === -1 ? 1 : -1;
          const swapMin =
            enemy.type === "orbit-drone"
              ? ORBIT_DRONE_STRAFE_SWAP_MIN_MS
              : SLUGGER_STRAFE_SWAP_MIN_MS;
          const swapVariance =
            enemy.type === "orbit-drone"
              ? ORBIT_DRONE_STRAFE_SWAP_VARIANCE_MS
              : SLUGGER_STRAFE_SWAP_VARIANCE_MS;
          enemy.nextStrafeSwapAt = now + swapMin + Math.random() * swapVariance;
        }

        const preferredRange = enemy.preferredRange || 260;
        const radialX = dx / distanceToTarget;
        const radialY = dy / distanceToTarget;
        const strafeX = -radialY;
        const strafeY = radialX;
        const strafeStrength =
          enemy.type === "slugger"
            ? 0.62
            : enemy.type === "leech-beacon"
              ? 0.38
              : enemy.type === "orbit-drone"
                ? 1.18
                : 1;
        const radialWeight =
          distanceToTarget < preferredRange * 0.78
            ? enemy.type === "orbit-drone"
              ? -0.92
              : -1.25
            : distanceToTarget > preferredRange * 1.12
              ? enemy.type === "orbit-drone"
                ? 0.82
                : 0.95
              : enemy.type === "slugger"
                ? 0.18
                : enemy.type === "leech-beacon"
                  ? 0.24
                  : enemy.type === "orbit-drone"
                    ? 0.06
                    : 0.12;
        const direction = {
          x:
            radialX * radialWeight +
            strafeX * (enemy.strafeDirection || 1) * strafeStrength,
          y:
            radialY * radialWeight +
            strafeY * (enemy.strafeDirection || 1) * strafeStrength,
        };
        this.moveEnemyAlong(
          enemy,
          direction,
          effectiveSpeed *
            (enemy.type === "neon-pulse"
              ? 0.92
              : enemy.type === "leech-beacon"
                ? 0.88
                : enemy.type === "orbit-drone"
                  ? 1.02
                  : 1),
          timeFactor,
        );
        return;
      }

      this.moveEnemyAlong(enemy, { x: dx, y: dy }, effectiveSpeed, timeFactor);
    });

    if (attachedSpiderIds.size > 0) {
      state.enemies = state.enemies.filter(
        (enemy) => !attachedSpiderIds.has(enemy.id),
      );
    }
  }

  private updatePlayerAttacks(state: GameState, delta: number, now: number) {
    state.players.forEach((p) => {
      if (p.status !== "alive") return;
      p.attackCooldown -= delta;
      const temporaryDamageMultiplier = this.getDamageMultiplierForPlayer(
        p,
        state,
      );
      const effectiveProjectileDamage =
        p.projectileDamage * temporaryDamageMultiplier;

      // Determine target: boss if in boss fight, otherwise closest enemy
      let targetPosition: { x: number; y: number } | null = null;

      if (state.status === "bossFight" && state.boss) {
        targetPosition = state.boss.position;
      } else if (state.enemies.length > 0) {
        const closestEnemy = state.enemies.reduce(
          (closest, enemy) => {
            const dist = Math.hypot(
              enemy.position.x - p.position.x,
              enemy.position.y - p.position.y,
            );
            return dist < closest.dist ? { enemy, dist } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity },
        );
        if (closestEnemy.enemy) {
          targetPosition = closestEnemy.enemy.position;
        }
      }

      if (p.attackCooldown <= 0 && targetPosition) {
        p.attackCooldown = p.attackSpeed;
        const baseAngle = Math.atan2(
          targetPosition.y - p.position.y,
          targetPosition.x - p.position.x,
        );

        // Weapon-specific behavior
        if (p.weaponType === "grenade-launcher") {
          // Boom Bringer: Single grenade with built-in explosion
          const isCrit = Math.random() < (p.critChance || 0);
          const damage = Math.round(
            effectiveProjectileDamage * (isCrit ? p.critMultiplier || 2 : 1),
          );
          const grenade: Projectile = {
            hitEnemies: [],
            pierceRemaining: 0,
            ricochetRemaining: 0,
            id: uuidv4(),
            ownerId: p.id,
            position: { ...p.position },
            velocity: {
              x: Math.cos(baseAngle) * 7,
              y: Math.sin(baseAngle) * 7,
            },
            damage,
            isCrit,
            kind: "bullet",
            radius: 8,
          };
          state.projectiles.push(grenade);
        } else if (p.weaponType === "burst-fire") {
          // Vampire Vex: 3-round burst
          if (!p.burstShotsFired) p.burstShotsFired = 0;

          if (p.burstShotsFired < 3) {
            const isCrit = Math.random() < (p.critChance || 0);
            const damage = Math.round(
              effectiveProjectileDamage * (isCrit ? p.critMultiplier || 2 : 1),
            );
            const bullet: Projectile = {
              hitEnemies: [],
              pierceRemaining: p.pierceCount || 0,
              ricochetRemaining: p.ricochetCount || 0,
              id: uuidv4(),
              ownerId: p.id,
              position: { ...p.position },
              velocity: {
                x: Math.cos(baseAngle) * 10,
                y: Math.sin(baseAngle) * 10,
              },
              damage,
              isCrit,
              kind: "bullet",
              radius: 5,
            };
            let echoShots: Projectile[] = [];
            if (p.hasEchoShots) {
              const echoBullet: Projectile = {
                ...bullet,
                id: uuidv4(),
                isEcho: true,
                timestamp: now + 200, // Spawn 200ms later
              };
              // I'll need a way to queue this.
              // Actually, I can just check isEcho in updateProjectiles and delay its movement.
            }
            state.projectiles.push(bullet);
            if (p.hasEchoShots) {
              const echoBullet: Projectile = {
                ...bullet,
                id: uuidv4(),
                isEcho: true,
                timestamp: now, // We'll handle the lag in updateProjectiles
              };
              state.projectiles.push(echoBullet);
            }
            p.burstShotsFired++;
            p.attackCooldown = 100; // 100ms between burst shots
          } else {
            p.burstShotsFired = 0;
            p.attackCooldown = p.attackSpeed; // Full cooldown after burst
          }
        } else if (p.weaponType === "heavy-cannon") {
          // Turret Tina: Slower, larger projectiles
          const isCrit = Math.random() < (p.critChance || 0);
          const damage = Math.round(
            effectiveProjectileDamage * (isCrit ? p.critMultiplier || 2 : 1),
          );
          const heavyShot: Projectile = {
            hitEnemies: [],
            pierceRemaining: p.pierceCount || 0,
            ricochetRemaining: p.ricochetCount || 0,
            id: uuidv4(),
            ownerId: p.id,
            position: { ...p.position },
            velocity: {
              x: Math.cos(baseAngle) * 6,
              y: Math.sin(baseAngle) * 6,
            },
            damage,
            isCrit,
            kind: "bullet",
            radius: 10, // Larger projectile
          };
          state.projectiles.push(heavyShot);
        } else if (p.weaponType === "shotgun") {
          // Dash Dynamo: Short-range shotgun spread
          const pellets = 5;
          const spread = (25 * Math.PI) / 180; // Wider spread
          const maxRange = 200; // Short range

          for (let i = 0; i < pellets; i++) {
            const offset = (i - (pellets - 1) / 2) * spread;
            const angle = baseAngle + offset;
            const isCrit = Math.random() < (p.critChance || 0);
            const damage = Math.round(
              effectiveProjectileDamage *
                0.4 *
                (isCrit ? p.critMultiplier || 2 : 1),
            ); // Lower damage per pellet
            const pellet: Projectile = {
              hitEnemies: [],
              pierceRemaining: 0,
              ricochetRemaining: 0,
              id: uuidv4(),
              ownerId: p.id,
              position: { ...p.position },
              velocity: { x: Math.cos(angle) * 12, y: Math.sin(angle) * 12 },
              damage,
              isCrit,
              kind: "bullet",
              radius: 4,
              maxRange,
              spawnPosition: { ...p.position },
            };
            state.projectiles.push(pellet);
          }
        } else {
          // Standard shooting (rapid-fire and sniper-shot)
          const shots = Math.max(1, p.projectilesPerShot || 1);
          const spread = (10 * Math.PI) / 180;
          for (let i = 0; i < shots; i++) {
            const offset = (i - (shots - 1) / 2) * spread;
            const angle = baseAngle + offset;
            const isCrit = Math.random() < (p.critChance || 0);

            // Overdrive fire rate logic
            let attackSpeed = p.attackSpeed;
            if (p.isAbilityActive && p.characterType === "spray-n-pray") {
              attackSpeed *= 0.4;
            }

            const damage = Math.round(
              effectiveProjectileDamage * (isCrit ? p.critMultiplier || 2 : 1),
            );
            const newBullet: Projectile = {
              hitEnemies: [],
              pierceRemaining: p.pierceCount || 0,
              ricochetRemaining: p.ricochetCount || 0,
              id: uuidv4(),
              ownerId: p.id,
              position: { ...p.position },
              velocity: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
              damage,
              isCrit,
              kind: "bullet",
              radius: 5,
            };
            state.projectiles.push(newBullet);
          }
        }

        const bananaShots = p.hasBananarang
          ? Math.max(0, p.bananarangsPerShot || 0)
          : 0;
        if (bananaShots > 0) {
          const bananaSpread = (10 * Math.PI) / 180;
          for (let i = 0; i < bananaShots; i++) {
            const offset = (i - (bananaShots - 1) / 2) * bananaSpread;
            const angle = baseAngle + offset;
            const isCrit = Math.random() < (p.critChance || 0);
            const damage = Math.round(
              effectiveProjectileDamage * (isCrit ? p.critMultiplier || 2 : 1),
            );
            const speed = 10;
            const maxRange = 220;
            const radius = 10;
            const bananarang: Projectile = {
              id: uuidv4(),
              ownerId: p.id,
              position: { ...p.position },
              velocity: {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
              },
              damage,
              isCrit,
              kind: "bananarang",
              spawnPosition: { ...p.position },
              maxRange,
              state: "outbound",
              returnSpeedMultiplier: 1.2,
              radius,
            };
            state.projectiles.push(bananarang);
          }
        }
      }
    });
  }

  private updateProjectiles(
    state: GameState,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    state.projectiles = state.projectiles.filter((proj) => {
      const owner = state.players.find((pp) => pp.id === proj.ownerId);
      const radius = proj.radius ?? 8;

      if (proj.kind === "bananarang") {
        const origin = proj.spawnPosition || proj.position;
        const distFromOrigin = Math.hypot(
          proj.position.x - origin.x,
          proj.position.y - origin.y,
        );
        if (
          proj.state === "outbound" &&
          proj.maxRange &&
          distFromOrigin >= proj.maxRange
        ) {
          proj.state = "returning";
        }

        if (proj.state === "returning" && owner) {
          const dx = owner.position.x - proj.position.x;
          const dy = owner.position.y - proj.position.y;
          const d = Math.hypot(dx, dy) || 1;
          const baseSpeed = Math.hypot(proj.velocity.x, proj.velocity.y) || 10;
          const speed = baseSpeed * (proj.returnSpeedMultiplier || 1.2);
          proj.velocity.x = (dx / d) * speed;
          proj.velocity.y = (dy / d) * speed;
          if (d < 16) {
            return false;
          }
        } else {
          const turn = 0.03 * timeFactor;
          const cosT = Math.cos(turn);
          const sinT = Math.sin(turn);
          const vx = proj.velocity.x;
          const vy = proj.velocity.y;
          proj.velocity.x = vx * cosT - vy * sinT;
          proj.velocity.y = vx * sinT + vy * cosT;
        }
      }

      // Check shotgun range limit
      if (proj.kind !== "bananarang" && proj.maxRange && proj.spawnPosition) {
        const distFromOrigin = Math.hypot(
          proj.position.x - proj.spawnPosition.x,
          proj.position.y - proj.spawnPosition.y,
        );
        if (distFromOrigin >= proj.maxRange) {
          return false; // Remove projectile
        }
      }

      if (
        proj.kind !== "bananarang" &&
        owner &&
        owner.homingStrength &&
        owner.homingStrength > 0
      ) {
        const nearestEnemy = state.enemies.reduce(
          (closest, enemy) => {
            const dist = Math.hypot(
              enemy.position.x - proj.position.x,
              enemy.position.y - proj.position.y,
            );
            return dist < closest.dist ? { enemy, dist } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity },
        );

        if (nearestEnemy.enemy && nearestEnemy.dist < 300) {
          const dx = nearestEnemy.enemy.position.x - proj.position.x;
          const dy = nearestEnemy.enemy.position.y - proj.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          const currentSpeed = Math.hypot(proj.velocity.x, proj.velocity.y);
          const homingForce = owner.homingStrength * 0.5;
          proj.velocity.x += (dx / dist) * homingForce;
          proj.velocity.y += (dy / dist) * homingForce;
          const newSpeed = Math.hypot(proj.velocity.x, proj.velocity.y);
          proj.velocity.x = (proj.velocity.x / newSpeed) * currentSpeed;
          proj.velocity.y = (proj.velocity.y / newSpeed) * currentSpeed;
        }
      }

      // Echo Shots delay
      if (proj.isEcho && proj.timestamp && now < proj.timestamp) {
        return true; // Don't move yet
      }

      // Growth Ray
      if (proj.isGrowth || (owner && owner.hasGrowthRay)) {
        if (!proj.isGrowth) proj.isGrowth = true; // Mark it
        if (proj.growthBaseRadius === undefined) {
          proj.growthBaseRadius = proj.radius || 5;
          proj.growthBaseDamage = proj.damage;
          proj.spawnPosition = proj.spawnPosition || {
            x: proj.position.x,
            y: proj.position.y,
          };
        }

        const maxRange = proj.maxRange || 600;
        const distFromOrigin = Math.hypot(
          proj.position.x - proj.spawnPosition.x,
          proj.position.y - proj.spawnPosition.y,
        );
        const progress = Math.min(1, Math.max(0, distFromOrigin / maxRange));
        const sizeMultiplier = 1 + 1.25 * progress;
        const damageMultiplier = 1 + 0.5 * progress;

        proj.radius = proj.growthBaseRadius * sizeMultiplier;
        proj.damage = proj.growthBaseDamage * damageMultiplier;
      }

      // Gravity Bullets
      if (
        owner &&
        owner.collectedUpgrades?.some((u) => u.type === "gravityBullets")
      ) {
        state.enemies.forEach((enemy) => {
          const dx = proj.position.x - enemy.position.x;
          const dy = proj.position.y - enemy.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 100) {
            const pullForce = (1 - dist / 100) * 2 * timeFactor;
            enemy.position.x += (dx / dist) * pullForce;
            enemy.position.y += (dy / dist) * pullForce;
          }
        });
      }

      proj.position.x += proj.velocity.x * timeFactor;
      proj.position.y += proj.velocity.y * timeFactor;

      // Screen Wrap Projectiles
      if (owner && owner.hasScreenWrap) {
        if (proj.position.x < -20) proj.position.x = ARENA_WIDTH + 10;
        if (proj.position.x > ARENA_WIDTH + 20) proj.position.x = -10;
        if (proj.position.y < -20) proj.position.y = ARENA_HEIGHT + 10;
        if (proj.position.y > ARENA_HEIGHT + 20) proj.position.y = -10;
      }

      // Legenday: Ghost Bullets
      if (owner && owner.hasGhostBullets) {
        // Ghost bullets ignore bounds or have much larger bounds
        return (
          proj.position.x > -500 &&
          proj.position.x < ARENA_WIDTH + 500 &&
          proj.position.y > -500 &&
          proj.position.y < ARENA_HEIGHT + 500
        );
      }

      // Omni-Glitch trail
      if (owner && owner.hasOmniGlitch && Math.random() < 0.2) {
        this.spawnParticles(proj.position, "#FF00FF", 1, "glitch", 2);
      }

      const isEnemyProjectile = state.enemies.some(
        (e) => e.id === proj.ownerId,
      );
      if (isEnemyProjectile) {
        for (const player of state.players) {
          if (player.status !== "alive") continue;
          if (
            Math.hypot(
              proj.position.x - player.position.x,
              proj.position.y - player.position.y,
            ) <
            radius + 15
          ) {
            let incomingDamage = proj.damage;
            if (player.dodge && Math.random() < player.dodge) {
              incomingDamage = 0;
            } else {
              if (player.armor && player.armor > 0) {
                incomingDamage *= 1 - player.armor;
              }
              if (player.shield && player.shield > 0) {
                const absorbed = Math.min(player.shield, incomingDamage);
                player.shield -= absorbed;
                incomingDamage -= absorbed;
              }
            }

            this.damagePlayer(player, incomingDamage, now);

            // Trigger screen shake and glitch particles on player hit
            if (incomingDamage > 1) {
              this.triggerScreenShake(Math.min(10, incomingDamage * 0.5), 200);
              this.spawnParticles(player.position, "#FF0000", 10, "glitch");
            }
            return false;
          }
        }
      }

      if (!isEnemyProjectile) {
        // Check boss collision first
        if (state.boss && state.status === "bossFight") {
          // Check shield generators first (Architect)
          if (
            state.boss.shieldGenerators &&
            state.boss.shieldGenerators.length > 0
          ) {
            for (const generator of state.boss.shieldGenerators) {
              const distToGen = Math.hypot(
                proj.position.x - generator.position.x,
                proj.position.y - generator.position.y,
              );
              if (distToGen < radius + 20) {
                generator.health -= proj.damage;

                if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                  owner.health = Math.min(
                    owner.maxHealth,
                    owner.health + proj.damage * owner.lifeSteal,
                  );
                  owner.lastHealedTimestamp = now;
                }

                return false;
              }
            }
          }

          // Check portals (Summoner)
          if (state.boss.portals && state.boss.portals.length > 0) {
            for (const portal of state.boss.portals) {
              const distToPortal = Math.hypot(
                proj.position.x - portal.position.x,
                proj.position.y - portal.position.y,
              );
              if (distToPortal < radius + 25) {
                portal.health -= proj.damage;

                if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                  owner.health = Math.min(
                    owner.maxHealth,
                    owner.health + proj.damage * owner.lifeSteal,
                  );
                  owner.lastHealedTimestamp = now;
                }

                return false;
              }
            }
          }

          // Check for enrage (at 50% health)
          if (
            !state.boss.isEnraged &&
            state.boss.health < state.boss.maxHealth * 0.5
          ) {
            state.boss.isEnraged = true;
            this.triggerScreenShake(20, 1000);
            this.spawnParticles(
              state.boss.position,
              "#FF0000",
              100,
              "glitch",
              20,
            );
          }

          // Check boss collision (skip if invulnerable)
          if (!state.boss.isInvulnerable) {
            const bossConfig = BOSS_CONFIGS[state.boss.type];
            const distToBoss = Math.hypot(
              proj.position.x - state.boss.position.x,
              proj.position.y - state.boss.position.y,
            );
            if (distToBoss < radius + bossConfig.size) {
              let finalDamage = proj.damage;
              if (owner && owner.health < owner.maxHealth * 0.3) {
                finalDamage *= 1.5;
              }
              state.boss.health -= finalDamage;
              state.boss.lastHitTimestamp = now;

              // Visual juice for boss hits
              this.triggerScreenShake(proj.isCrit ? 5 : 2, 100);
              this.spawnParticles(
                proj.position,
                proj.isCrit ? "#FF0000" : "#00FFFF",
                proj.isCrit ? 15 : 8,
                proj.isCrit ? "glitch" : "pixel",
              );

              if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                owner.health = Math.min(
                  owner.maxHealth,
                  owner.health + proj.damage * owner.lifeSteal,
                );
                owner.lastHealedTimestamp = now;
              }

              // Don't pierce/ricochet on boss hits
              return false;
            }
          }
        }

        for (const enemy of state.enemies) {
          if (proj.hitEnemies && proj.hitEnemies.includes(enemy.id)) continue;
          if (
            Math.hypot(
              proj.position.x - enemy.position.x,
              proj.position.y - enemy.position.y,
            ) <
            radius + 10
          ) {
            let finalDamage = proj.damage;
            if (owner && owner.health < owner.maxHealth * 0.3) {
              finalDamage *= 1.5;
            }
            if (owner && enemy.health < enemy.maxHealth * 0.15) {
              finalDamage = enemy.health;
            }
            enemy.health -= finalDamage;
            this.markEnemyDamagedBySource(state, enemy, proj.ownerId);

            // Glitch Patch heal chance
            if (owner && owner.hasGlitchPatch && Math.random() < 0.2) {
              owner.health = Math.min(owner.maxHealth, owner.health + 1);
              owner.lastHealedTimestamp = now;
            }

            // Particle hit effect
            const isCrit = proj.isCrit || false;
            this.spawnParticles(
              proj.position,
              isCrit ? "#FF0000" : "#FFFF00",
              isCrit ? 12 : 6,
              isCrit ? "glitch" : "blood",
            );

            // Boom Bringer grenade explosion on hit
            if (owner && owner.weaponType === "grenade-launcher") {
              if (!state.explosions) state.explosions = [];
              state.explosions.push({
                id: uuidv4(),
                position: { ...proj.position },
                radius: 60,
                timestamp: now,
                damage: finalDamage * 0.5,
                ownerId: owner.id,
                type: "normal",
                damagedEnemyIds: [],
              });
            }
            if (owner && owner.knockbackForce && owner.knockbackForce > 0) {
              const angle = Math.atan2(
                enemy.position.y - proj.position.y,
                enemy.position.x - proj.position.x,
              );
              enemy.position.x += Math.cos(angle) * owner.knockbackForce;
              enemy.position.y += Math.sin(angle) * owner.knockbackForce;
            }
            if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
              owner.health = Math.min(
                owner.maxHealth,
                owner.health + proj.damage * owner.lifeSteal,
              );
              owner.lastHealedTimestamp = now;
            }
            enemy.lastHitTimestamp = now;
            if (proj.isCrit) enemy.lastCritTimestamp = now;
            if (owner) {
              if (!enemy.statusEffects) enemy.statusEffects = [];

              // Helper to add/refresh status effects with capping
              const addOrRefreshEffect = (
                effectType: string,
                effectData: any,
              ) => {
                const existing = enemy.statusEffects!.find(
                  (e) => e.type === effectType,
                );
                if (existing) {
                  // Refresh existing effect
                  existing.duration = Math.max(
                    existing.duration,
                    effectData.duration,
                  );
                  if (effectData.damage)
                    existing.damage = Math.max(
                      existing.damage || 0,
                      effectData.damage,
                    );
                  if (effectData.slowAmount)
                    existing.slowAmount = Math.min(
                      existing.slowAmount || 1,
                      effectData.slowAmount,
                    );
                } else if (
                  enemy.statusEffects!.length < MAX_STATUS_EFFECTS_PER_ENEMY
                ) {
                  enemy.statusEffects!.push(effectData);
                }
              };

              if (owner.fireDamage && owner.fireDamage > 0) {
                addOrRefreshEffect("burning", {
                  type: "burning",
                  damage: owner.fireDamage * proj.damage,
                  duration: 2000,
                });
              }
              if (owner.poisonDamage && owner.poisonDamage > 0) {
                addOrRefreshEffect("poisoned", {
                  type: "poisoned",
                  damage: owner.poisonDamage * proj.damage,
                  duration: 3000,
                });
              }
              if (owner.iceSlow && owner.iceSlow > 0) {
                addOrRefreshEffect("slowed", {
                  type: "slowed",
                  slowAmount: owner.iceSlow,
                  duration: 2000,
                });
              }
            }
            addDamageNumber(
              enemy,
              proj.damage,
              proj.isCrit || false,
              enemy.position,
              now,
            );

            if (owner && owner.chainCount && owner.chainCount > 0) {
              const chainRange = 150;
              const chainDamage = finalDamage * 0.7;
              let currentTarget = enemy;
              const hitByChain = new Set([enemy.id]);

              for (let i = 0; i < owner.chainCount; i++) {
                const nearbyEnemies = state.enemies.filter(
                  (e) =>
                    !hitByChain.has(e.id) &&
                    Math.hypot(
                      e.position.x - currentTarget.position.x,
                      e.position.y - currentTarget.position.y,
                    ) < chainRange,
                );

                if (nearbyEnemies.length === 0) break;

                const nextTarget = nearbyEnemies.reduce(
                  (closest, e) => {
                    const dist = Math.hypot(
                      e.position.x - currentTarget.position.x,
                      e.position.y - currentTarget.position.y,
                    );
                    return dist < closest.dist ? { enemy: e, dist } : closest;
                  },
                  { enemy: null as Enemy | null, dist: Infinity },
                ).enemy;

                if (!nextTarget) break;

                nextTarget.health -= chainDamage;
                this.markEnemyDamagedBySource(state, nextTarget, proj.ownerId);
                nextTarget.lastHitTimestamp = now;
                addDamageNumber(
                  nextTarget,
                  chainDamage,
                  false,
                  nextTarget.position,
                  now,
                );

                if (!state.chainLightning) state.chainLightning = [];
                state.chainLightning.push({
                  id: uuidv4(),
                  from: { ...currentTarget.position },
                  to: { ...nextTarget.position },
                  timestamp: now,
                });

                hitByChain.add(nextTarget.id);
                currentTarget = nextTarget;
              }
            }

            if (proj.kind !== "bananarang") {
              if (!proj.hitEnemies) proj.hitEnemies = [];
              proj.hitEnemies.push(enemy.id);

              if (proj.ricochetRemaining && proj.ricochetRemaining > 0) {
                const nearbyEnemies = state.enemies.filter(
                  (e) => !proj.hitEnemies!.includes(e.id) && e.health > 0,
                );

                if (nearbyEnemies.length > 0) {
                  const nextTarget = nearbyEnemies.reduce(
                    (closest, e) => {
                      const dist = Math.hypot(
                        e.position.x - proj.position.x,
                        e.position.y - proj.position.y,
                      );
                      return dist < closest.dist ? { enemy: e, dist } : closest;
                    },
                    { enemy: null as Enemy | null, dist: Infinity },
                  ).enemy;

                  if (nextTarget) {
                    const dx = nextTarget.position.x - proj.position.x;
                    const dy = nextTarget.position.y - proj.position.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const speed = Math.hypot(proj.velocity.x, proj.velocity.y);
                    proj.velocity.x = (dx / dist) * speed;
                    proj.velocity.y = (dy / dist) * speed;
                    proj.ricochetRemaining--;
                  } else {
                    return false;
                  }
                } else {
                  return false;
                }
              } else if (owner && owner.hasOmniGlitch) {
                // Infinite pierce for Omni-Glitch
              } else if (!proj.pierceRemaining || proj.pierceRemaining <= 0) {
                return false;
              } else {
                proj.pierceRemaining--;
              }
            }
          }
        }
      }

      const inBounds =
        proj.position.x > -40 &&
        proj.position.x < ARENA_WIDTH + 40 &&
        proj.position.y > -40 &&
        proj.position.y < ARENA_HEIGHT + 40;
      return inBounds;
    });

    state.enemies.forEach((enemy) => {
      if (enemy.damageNumbers) {
        enemy.damageNumbers = enemy.damageNumbers.filter(
          (dmg) => now - dmg.timestamp < 1000,
        );
      }
    });

    const deadEnemies = state.enemies.filter((e) => e.health <= 0);
    deadEnemies.forEach((dead) => {
      // Check if any player has lucky upgrade
      const hasLuckyPlayer = state.players.some((p) => p.hasLucky);
      // Death explosion particles
      this.spawnParticles(dead.position, "#FFFF00", 20, "pixel", 10);
      this.spawnParticles(dead.position, "#FF0000", 10, "blood", 8);

      const coinValue = hasLuckyPlayer
        ? COIN_DROP_PER_KILL * LUCKY_COIN_MULTIPLIER
        : COIN_DROP_PER_KILL;

      state.xpOrbs.push({
        id: uuidv4(),
        position: { ...dead.position },
        value: coinValue,
        kind: "coin",
        isDoubled: hasLuckyPlayer,
      });

      // Kill-based XP: award XP from enemy difficulty (xpValue) to the nearest alive player.
      const xpRecipient = state.players
        .filter((p) => p.status === "alive")
        .reduce(
          (closest, p) => {
            const dist = Math.hypot(
              p.position.x - dead.position.x,
              p.position.y - dead.position.y,
            );
            return dist < closest.dist ? { player: p, dist } : closest;
          },
          { player: null as Player | null, dist: Infinity },
        ).player;
      if (xpRecipient) {
        xpRecipient.xp += dead.xpValue;
      }

      // Track enemy kills
      this.enemiesKilledCount++;

      if (dead.type === "hellhound" && state.isHellhoundRound) {
        state.hellhoundsKilled = (state.hellhoundsKilled || 0) + 1;
      }

      // Splitter mechanic: spawn mini-splitters when killed
      if (dead.type === "splitter") {
        const splitCount = 2 + Math.floor(Math.random() * 2); // 2-3 mini-splitters
        for (let i = 0; i < splitCount; i++) {
          const angle = ((Math.PI * 2) / splitCount) * i + Math.random() * 0.5;
          const distance = 30 + Math.random() * 20;
          const spawnPos = {
            x: dead.position.x + Math.cos(angle) * distance,
            y: dead.position.y + Math.sin(angle) * distance,
          };
          const miniSplitter = createEnemy(
            uuidv4(),
            spawnPos,
            "mini-splitter",
            state.wave,
          );
          state.enemies.push(miniSplitter);
        }
      }

      this.spawnEnemyDeathExplosion(state, dead, now);

      // Binary Rain
      if (
        state.players.some((p) =>
          p.collectedUpgrades?.some((u) => u.type === "binaryRain"),
        ) &&
        Math.random() < 0.3
      ) {
        if (!state.binaryDrops) state.binaryDrops = [];
        state.binaryDrops.push({
          id: uuidv4(),
          position: { ...dead.position },
          type: Math.random() < 0.5 ? "0" : "1",
          timestamp: now,
        });
      }
    });
    state.enemies = state.enemies.filter((e) => e.health > 0);

    if (
      state.isHellhoundRound &&
      state.hellhoundsKilled === state.totalHellhoundsInRound &&
      state.enemies.length === 0
    ) {
      state.hellhoundRoundComplete = true;
    }
  }

  private resolvePlayerOwnerId(
    state: GameState,
    sourceOwnerId?: string,
  ): string | null {
    if (!sourceOwnerId) return null;
    if (state.players.some((player) => player.id === sourceOwnerId)) {
      return sourceOwnerId;
    }
    const petOwnerId = state.pets?.find(
      (pet) => pet.id === sourceOwnerId,
    )?.ownerId;
    return petOwnerId || null;
  }

  private markEnemyDamagedBySource(
    state: GameState,
    enemy: Enemy,
    sourceOwnerId?: string,
  ) {
    const playerOwnerId = this.resolvePlayerOwnerId(state, sourceOwnerId);
    if (playerOwnerId) {
      enemy.lastDamagedByPlayerId = playerOwnerId;
    }
  }

  private spawnEnemyDeathExplosion(
    state: GameState,
    dead: Enemy,
    now: number,
  ) {
    const killerId = dead.lastDamagedByPlayerId;
    if (!killerId) return;

    const killer = state.players.find((player) => player.id === killerId);
    if (!killer || !killer.explosionDamage || killer.explosionDamage <= 0) {
      return;
    }

    const voidStacks = killer.voidImplosionStacks || 0;
    const isVoidImplosion = voidStacks > 0;
    const radius = isVoidImplosion
      ? Math.min(188, 104 + voidStacks * 20)
      : 80;
    const durationMs = isVoidImplosion
      ? Math.min(1400, 850 + voidStacks * 140)
      : 500;

    if (!state.explosions) state.explosions = [];
    state.explosions.push({
      id: uuidv4(),
      position: { ...dead.position },
      radius,
      timestamp: now,
      damage: dead.maxHealth * killer.explosionDamage,
      ownerId: killer.id,
      type: isVoidImplosion ? "void" : "normal",
      durationMs,
      pullRadius: isVoidImplosion ? Math.max(220, radius * 1.9) : undefined,
      pullStrength: isVoidImplosion ? 8 + voidStacks * 1.8 : undefined,
      damagedEnemyIds: [],
    });
  }

  private updateStatusEffects(state: GameState, delta: number) {
    state.enemies.forEach((enemy) => {
      if (!enemy.statusEffects || enemy.statusEffects.length === 0) return;
      enemy.statusEffects = enemy.statusEffects.filter((effect) => {
        effect.duration -= delta;
        if (effect.duration <= 0) return false;
        if (effect.damage && effect.damage > 0) {
          const dotDamage =
            (effect.damage / (effect.type === "burning" ? 2000 : 3000)) * delta;
          enemy.health -= dotDamage;
        }
        return true;
      });
    });
  }

  private updateExplosions(state: GameState, now: number, timeFactor: number) {
    if (!state.explosions) return;
    state.explosions.forEach((explosion) => {
      // Pull effect for Void Implosion
      if (explosion.type === "void") {
        const pullRadius = explosion.pullRadius || explosion.radius * 2;
        const pullStrength = explosion.pullStrength || 5;
        state.enemies.forEach((enemy) => {
          const dx = explosion.position.x - enemy.position.x;
          const dy = explosion.position.y - enemy.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < pullRadius) {
            const pullForce =
              (1 - dist / pullRadius) * pullStrength * timeFactor;
            enemy.position.x += (dx / dist) * pullForce;
            enemy.position.y += (dy / dist) * pullForce;
          }
        });
      }

      state.enemies.forEach((enemy) => {
        if (explosion.damagedEnemyIds?.includes(enemy.id)) return;
        const dist = Math.hypot(
          enemy.position.x - explosion.position.x,
          enemy.position.y - explosion.position.y,
        );
        if (dist < explosion.radius) {
          enemy.health -= explosion.damage;
          this.markEnemyDamagedBySource(state, enemy, explosion.ownerId);
          enemy.lastHitTimestamp = now;
          if (!explosion.damagedEnemyIds) explosion.damagedEnemyIds = [];
          explosion.damagedEnemyIds.push(enemy.id);
        }
      });
    });
    state.explosions = state.explosions.filter(
      (exp) => now - exp.timestamp < (exp.durationMs || 500),
    );
  }

  private updateChainLightning(state: GameState, now: number) {
    if (!state.chainLightning) return;
    state.chainLightning = state.chainLightning.filter(
      (chain) => now - chain.timestamp < 200,
    );
  }

  private updateOrbitalSkulls(state: GameState, now: number, delta: number) {
    if (!state.orbitalSkulls) state.orbitalSkulls = [];
    if (!state.fireTrails) state.fireTrails = [];

    const ORBITAL_SPEED = 2; // radians per second
    const FIRE_TRAIL_INTERVAL = 100; // ms between trail spawns
    const SKULL_DAMAGE_COOLDOWN = 200; // ms between damage ticks

    state.orbitalSkulls = state.orbitalSkulls.filter((skull) => {
      const owner = state.players.find((p) => p.id === skull.ownerId);
      if (!owner || owner.status === "dead") return false;

      // Rotate skull
      skull.angle += (ORBITAL_SPEED * delta) / 1000;
      if (skull.angle > Math.PI * 2) skull.angle -= Math.PI * 2;

      // Calculate skull position
      const skullX = owner.position.x + Math.cos(skull.angle) * skull.radius;
      const skullY = owner.position.y + Math.sin(skull.angle) * skull.radius;

      // Spawn fire trail periodically
      if (
        !skull.lastDamageTimestamp ||
        now - skull.lastDamageTimestamp >= FIRE_TRAIL_INTERVAL
      ) {
        const fireTrail: FireTrail = {
          id: uuidv4(),
          position: { x: skullX, y: skullY },
          timestamp: now,
          radius: 25,
          damage: skull.damage * 0.5, // Trail does 50% of skull damage
          ownerId: owner.id,
        };
        state.fireTrails.push(fireTrail);
        skull.lastDamageTimestamp = now;
      }

      // Check collision with enemies
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - skullX,
          enemy.position.y - skullY,
        );
        if (dist < 20) {
          // Skull hitbox radius
          enemy.health -= skull.damage;
          this.markEnemyDamagedBySource(state, enemy, owner.id);
          enemy.lastHitTimestamp = now;

          // Apply burning status effect from skulls
          if (!enemy.statusEffects) enemy.statusEffects = [];
          const burnDamage = skull.damage * 0.5; // 50% of skull damage as burn
          const existing = enemy.statusEffects.find(
            (e) => e.type === "burning",
          );
          if (existing) {
            existing.duration = 2000; // Refresh duration
            existing.damage = Math.max(existing.damage || 0, burnDamage);
          } else {
            enemy.statusEffects.push({
              type: "burning",
              damage: burnDamage,
              duration: 2000,
            });
          }
        }
      });

      return true;
    });
  }

  private updateFireTrails(state: GameState, now: number, delta: number) {
    if (!state.fireTrails) return;

    const FIRE_TRAIL_DURATION = 2000; // 2 seconds
    const HAZARD_FIRE_TRAIL_DURATION = 6000; // 3x longer for TNT hazard patches
    const FIRE_TRAIL_DAMAGE_INTERVAL = 200; // Damage every 200ms

    state.fireTrails.forEach((trail) => {
      // Check if enough time has passed for next damage tick
      const timeSinceSpawn = now - trail.timestamp;

      // Damage enemies in trail
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - trail.position.x,
          enemy.position.y - trail.position.y,
        );
        if (dist < trail.radius) {
          // Apply damage periodically
          if (timeSinceSpawn % FIRE_TRAIL_DAMAGE_INTERVAL < 50) {
            // Small window for damage tick
            enemy.health -= trail.damage * (delta / 1000);
            this.markEnemyDamagedBySource(state, enemy, trail.ownerId);
            enemy.lastHitTimestamp = now;

            // Apply burning status
            if (!enemy.statusEffects) enemy.statusEffects = [];
            const existing = enemy.statusEffects.find(
              (e) => e.type === "burning",
            );
            if (existing) {
              existing.duration = 2000;
            } else {
              enemy.statusEffects.push({
                type: "burning",
                damage: trail.damage * 0.3,
                duration: 2000,
              });
            }
          }
        }
      });
    });

    // Remove old fire trails
    state.fireTrails = state.fireTrails.filter(
      (trail) =>
        now - trail.timestamp <
        (trail.ownerId === "hazard"
          ? HAZARD_FIRE_TRAIL_DURATION
          : FIRE_TRAIL_DURATION),
    );
  }

  private getDamageMultiplierForPlayer(
    player: Player,
    state: GameState,
  ): number {
    const multiplier = player.temporaryDamageMultiplier || 1;
    if (multiplier <= 1) return 1;
    if (
      player.temporaryDamageExpiresWave !== undefined &&
      state.wave > player.temporaryDamageExpiresWave
    ) {
      player.temporaryDamageMultiplier = 1;
      player.temporaryDamageExpiresWave = undefined;
      return 1;
    }
    return multiplier;
  }

  private updateXPOrbs(state: GameState, timeFactor: number) {
    // For each orb, find if any player is close enough to pull it
    state.xpOrbs.forEach((orb) => {
      let closestPlayer: Player | null = null;
      let minDistance = Infinity;

      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dx = p.position.x - orb.position.x;
        const dy = p.position.y - orb.position.y;
        const distance = Math.hypot(dx, dy);
        const radius = p.pickupRadius || 30;

        if (distance < radius && distance < minDistance) {
          minDistance = distance;
          closestPlayer = p;
        }
      });

      if (closestPlayer) {
        const dx = closestPlayer.position.x - orb.position.x;
        const dy = closestPlayer.position.y - orb.position.y;
        const distance = minDistance; // already calculated
        const radius = (closestPlayer as Player).pickupRadius || 80;

        if (distance > 0) {
          // Magnet pull speed: base speed + increases as it gets closer
          // We want it to feel fast but not instant
          const pullSpeed = 6 + (radius / Math.max(10, distance)) * 4;
          const moveX = (dx / distance) * pullSpeed * timeFactor;
          const moveY = (dy / distance) * pullSpeed * timeFactor;

          // Don't overshoot
          if (Math.abs(moveX) > Math.abs(dx))
            orb.position.x = closestPlayer.position.x;
          else orb.position.x += moveX;

          if (Math.abs(moveY) > Math.abs(dy))
            orb.position.y = closestPlayer.position.y;
          else orb.position.y += moveY;
        }
      }
    });

    // Handle collection and leveling for each player
    state.players.forEach((p) => {
      if (p.status !== "alive") return;

      state.xpOrbs = state.xpOrbs.filter((orb) => {
        const distance = Math.hypot(
          p.position.x - orb.position.x,
          p.position.y - orb.position.y,
        );
        if (distance < 10) {
          if (orb.kind === "coin") {
            p.coins = (p.coins || 0) + orb.value;
          } else {
            p.xp += orb.value;
          }
          return false;
        }
        return true;
      });

      if (p.xp >= p.xpToNextLevel) {
        p.level++;

        // Track level 10 achievement (only once per game per player)
        if (p.level === 10 && !this.level10Tracked.has(p.id)) {
          this.level10Tracked.add(p.id);
          incrementLevel10Count();

          // Check for unlocks
          const newlyUnlocked = checkUnlocks();
          if (newlyUnlocked.length > 0 && this.onUnlock) {
            newlyUnlocked.forEach((charType) => this.onUnlock!(charType));
          }
        }

        p.xp -= p.xpToNextLevel;
        p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5);
        const choices = getRandomUpgrades(3).map((o) => ({
          ...o,
          id: uuidv4(),
          source: "levelUp" as const,
        }));
        this.openUpgradePrompt(p.id, choices);
      }
    });
  }

  private updateExtraction(state: GameState, delta: number) {
    if (!state.teleporter) return;

    const alivePlayers = state.players.filter((p) => p.status === "alive");

    alivePlayers.forEach((player) => {
      const distToTeleporter = Math.hypot(
        player.position.x - state.teleporter!.position.x,
        player.position.y - state.teleporter!.position.y,
      );

      const isInTeleporter = distToTeleporter < state.teleporter!.radius;

      if (isInTeleporter) {
        // Player is in extraction zone - increase progress
        if (!player.extractionProgress) player.extractionProgress = 0;
        player.extractionProgress += delta;

        // Check if extraction is complete
        if (player.extractionProgress >= EXTRACTION_DURATION) {
          // Check if all alive players have completed extraction
          const allExtracted = alivePlayers.every(
            (p) => (p.extractionProgress || 0) >= EXTRACTION_DURATION,
          );

          if (allExtracted) {
            state.status = "won";
          }
        }
      } else {
        // Player left extraction zone - reset progress
        player.extractionProgress = 0;
      }
    });
  }

  private updateWaves(state: GameState, delta: number) {
    if (state.isSandboxMode) return;
    if (state.isShopRound) return;

    if (state.currentEncounterType === "hellhound") {
      if (state.hellhoundRoundComplete && !this.returnToMapAfterUpgrade) {
        this.applyRunMapRewards(state, this.getCurrentNodeRewards(state));
        const player = state.players.find((p) => p.status === "alive");
        if (player) {
          const legendaryUpgrades = getRandomUpgrades(3, "legendary");
          this.openUpgradePrompt(
            player.id,
            legendaryUpgrades.map((option) => ({
              ...option,
              id: uuidv4(),
              source: "levelUp" as const,
            })),
          );
          this.returnToMapAfterUpgrade = true;
        } else {
          this.enterMapSelection(state);
        }
      }
      return;
    }

    if (state.currentEncounterType !== "combat") {
      return;
    }

    if (state.encounterPhase === "intermission") {
      const remainingIntermission = Math.max(
        0,
        (state.encounterIntermissionMs || 0) - delta,
      );
      state.encounterIntermissionMs = remainingIntermission;
      state.waveTimer = remainingIntermission;
      if (remainingIntermission <= 0) {
        this.beginCombatEncounterWave(state, (state.encounterWave || 0) + 1);
      }
      return;
    }

    if (
      this.combatSpawnQueue.length > 0 &&
      state.enemies.length < this.getCombatEnemyCap(state)
    ) {
      this.combatSpawnCooldownMs -= delta;
      if (this.combatSpawnCooldownMs <= 0) {
        const nextPack = this.combatSpawnQueue.shift();
        if (nextPack) {
          this.spawnCombatPack(state, nextPack);
          this.combatSpawnCooldownMs = nextPack.cooldownMs;
        }
      }
    }

    const encounterEnemiesRemaining =
      state.enemies.length +
      this.combatSpawnQueue.reduce((sum, pack) => sum + pack.enemies.length, 0);
    state.encounterEnemiesRemaining = encounterEnemiesRemaining;
    state.waveTimer = 0;

    if (this.combatSpawnQueue.length > 0) {
      state.encounterPhase = "spawning";
      return;
    }

    if (state.enemies.length > 0) {
      state.encounterPhase = "clearing";
      return;
    }

    if ((state.encounterWave || 0) >= (state.encounterWavesTotal || 0)) {
      this.applyRunMapRewards(state, this.getCurrentNodeRewards(state));
      this.enterMapSelection(state);
      return;
    }

    state.encounterPhase = "intermission";
    state.encounterIntermissionMs =
      COMBAT_INTERMISSION_BASE_MS +
      Math.max(0, (state.encounterWave || 1) - 1) * COMBAT_INTERMISSION_STEP_MS;
  }

  private updateGameStatus(state: GameState) {
    const previousStatus = state.status;

    if (state.players.every((p) => p.status === "dead")) {
      state.status = "gameOver";
    }

    // Save stats when game ends
    if (
      previousStatus !== "gameOver" &&
      previousStatus !== "won" &&
      (state.status === "gameOver" || state.status === "won")
    ) {
      this.saveGameStats(state);
    }
  }

  private saveGameStats(state: GameState) {
    const survivalTimeMs = Date.now() - this.gameStartTime;
    const stats = {
      characterType: this.characterType,
      waveReached: state.wave,
      enemiesKilled: this.enemiesKilledCount,
      survivalTimeMs,
      isVictory: state.status === "won",
      timestamp: Date.now(),
    };
    console.log("Saving game stats:", stats, "Game status:", state.status);
    saveLastRunStats(stats);
    recordGameEnd(state.wave, this.enemiesKilledCount);
    recordSurvivalTime(survivalTimeMs);
    if (state.status === "won") {
      recordExtractionWin();
      if (state.wave >= 5 && !this.tookDamageAfterWave5) {
        recordNoHitAfterWave5Win();
      }
    }

    // Check for unlocks after updating progression
    const newlyUnlocked = checkUnlocks();
    if (newlyUnlocked.length > 0 && this.onUnlock) {
      newlyUnlocked.forEach((charType) => this.onUnlock!(charType));
    }
  }

  private updateBoss(
    state: GameState,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    if (!state.boss) return;

    const boss = state.boss;
    const config = BOSS_CONFIGS[boss.type];
    const isAttacking = !!boss.currentAttack;
    let currentSpeed = config.baseSpeed;
    if (boss.isEnraged) currentSpeed *= 1.5;

    // Check for enrage (Phase 2)
    if (
      !boss.isEnraged &&
      boss.health < boss.maxHealth * config.enrageThreshold
    ) {
      boss.isEnraged = true;
      boss.phase = 2;
      this.triggerScreenShake(30, 1500);
      this.spawnParticles(boss.position, "#FF0000", 200, "glitch", 40);

      // Boss specific enrage effects
      if (boss.type === "berserker") {
        this.spawnParticles(boss.position, "#FFAA00", 150, "nebula", 30);
      }
    }

    // Update portals (Summoner)
    if (boss.portals && boss.portals.length > 0) {
      boss.portals.forEach((portal) => {
        portal.spawnCooldown -= delta;

        // Spawn enemy from portal
        if (portal.spawnCooldown <= 0) {
          portal.spawnCooldown = portal.spawnInterval;

          // Spawn a weak enemy
          const enemyType = Math.random() < 0.7 ? "grunt" : "slugger";
          const newEnemy = createEnemy(
            uuidv4(),
            { ...portal.position },
            enemyType,
            state.wave,
          );
          // Make portal enemies slightly weaker
          newEnemy.health *= 0.7;
          newEnemy.maxHealth *= 0.7;
          state.enemies.push(newEnemy);
        }
      });

      // Remove destroyed portals
      boss.portals = boss.portals.filter((p) => p.health > 0);
    }

    // Update shield generators (Architect)
    if (boss.shieldGenerators && boss.shieldGenerators.length > 0) {
      // Remove destroyed generators
      boss.shieldGenerators = boss.shieldGenerators.filter((g) => g.health > 0);

      // If all generators destroyed, remove invulnerability
      if (boss.shieldGenerators.length === 0 && boss.isInvulnerable) {
        boss.isInvulnerable = false;
      }
    }

    // Update Tesla Balls (Magnetic Magnus)
    if (boss.teslaBalls && boss.teslaBalls.length > 0) {
      this.updateTeslaBalls(state, boss, now, delta, timeFactor);
    }

    // Update attack cooldown
    if (boss.attackCooldown > 0) {
      boss.attackCooldown -= delta;
    }

    // Handle current attack
    if (boss.currentAttack) {
      this.updateBossAttack(state, boss, now, delta, timeFactor);
    } else if (boss.attackCooldown <= 0) {
      // Start new attack
      this.startBossAttack(state, boss, now);
    } else {
      // Chase player when not attacking
      this.bossChasePlayer(state, boss, timeFactor);
    }

    // Check if boss is defeated
    if (boss.health <= 0) {
      const currentNode = this.getCurrentMapNode(state);
      this.enemiesKilledCount++;
      incrementBossDefeats();
      state.boss = null;
      if (state.currentEncounterType === "boss" && currentNode?.depth === 10) {
        state.currentEncounterType = null;
        state.status = "won";
        this.saveGameStats(state);
      } else {
        state.status = "bossDefeated";
        state.bossDefeatedRewardClaimed = false;
        // Spawn teleporter at center
        state.teleporter = {
          id: "teleporter",
          position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
          radius: 50,
        };
      }
    }
  }

  private updateTeslaBalls(
    state: GameState,
    boss: Boss,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    if (!boss.teslaBalls) return;

    const config = BOSS_CONFIGS[boss.type];
    const isEnraged = boss.isEnraged || false;

    boss.teslaBalls.forEach((ball) => {
      // 1. Rotate
      ball.angle += (MAGNUS_TESLA_BALL_ROTATION_SPEED * delta) / 1000;

      // 2. Oscillate radius if enraged
      if (isEnraged) {
        const oscillationSpeed = 2; // Speed of oscillation
        const oscillationOffset =
          Math.sin((now / 1000) * oscillationSpeed) *
          MAGNUS_TESLA_BALL_OSCILLATION_AMPLITUDE;
        ball.radius = MAGNUS_TESLA_BALL_BASE_RADIUS + oscillationOffset;
      } else {
        ball.radius = MAGNUS_TESLA_BALL_BASE_RADIUS;
      }

      // 3. Collision detection with players
      const ballPos = {
        x: boss.position.x + Math.cos(ball.angle) * ball.radius,
        y: boss.position.y + Math.sin(ball.angle) * ball.radius,
      };

      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dist = Math.hypot(
          p.position.x - ballPos.x,
          p.position.y - ballPos.y,
        );

        // Ball radius is roughly 15-20 units
        if (dist < 20 + 15) {
          let damage = MAGNUS_TESLA_BALL_DAMAGE * (delta / 1000);

          if (p.dodge && Math.random() < p.dodge) {
            damage = 0;
          } else {
            if (p.armor && p.armor > 0) {
              damage *= 1 - p.armor;
            }
            if (p.shield && p.shield > 0) {
              const absorbed = Math.min(p.shield, damage);
              p.shield -= absorbed;
              damage -= absorbed;
            }
          }

          if (damage > 0) {
            this.damagePlayer(p, damage, now);

            // Visual feedback on hit
            if (now % 200 < 50) {
              // Throttle particles
              this.spawnParticles(ballPos, "#00FFFF", 5, "glitch", 5);
            }
          }
        }
      });
    });
  }

  private startBossAttack(state: GameState, boss: Boss, now: number) {
    const config = BOSS_CONFIGS[boss.type];
    // Increase attack frequency when enraged
    const cooldown =
      (config.attackCooldown + Math.random() * 2000) *
      (boss.isEnraged ? 0.6 : 1);

    if (boss.type === "berserker") {
      const chargeChance = boss.isEnraged ? 0.7 : 0.6;
      const attackType = Math.random() < chargeChance ? "charge" : "slam";

      if (attackType === "charge") {
        const target = this.getNearestPlayer(state, boss.position);
        if (!target) return;

        const dx = target.position.x - boss.position.x;
        const dy = target.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;

        boss.currentAttack = {
          type: "charge",
          telegraphStartTime: now,
          telegraphDuration: BERSERKER_CHARGE_TELEGRAPH,
          executeTime: now + BERSERKER_CHARGE_TELEGRAPH,
          direction: { x: dx / dist, y: dy / dist },
          count: boss.isEnraged ? BERSERKER_ENRAGED_CHARGE_COUNT : 1,
        };
      } else {
        const isShotgun = boss.isEnraged && Math.random() < 0.5;
        boss.currentAttack = {
          type: isShotgun ? "shotgun-burst" : "slam",
          telegraphStartTime: now,
          telegraphDuration: BERSERKER_SLAM_TELEGRAPH,
          executeTime: now + BERSERKER_SLAM_TELEGRAPH,
          targetPosition: { ...boss.position },
          count: boss.isEnraged ? 2 : 1,
        };
      }
    } else if (boss.type === "summoner") {
      // Summoner: Summon, Teleport, Beam, or Shotgun Burst (enraged)
      const rand = Math.random();
      let attackType:
        | "summon"
        | "teleport"
        | "beam"
        | "void-well"
        | "shotgun-burst";

      if (rand < 0.3) {
        attackType = boss.isEnraged ? "void-well" : "summon";
      } else if (rand < 0.5) {
        attackType = boss.isEnraged ? "shotgun-burst" : "beam";
      } else if (rand < 0.8) {
        attackType = "teleport";
      } else {
        attackType = "beam";
      }

      if (attackType === "shotgun-burst") {
        boss.currentAttack = {
          type: "shotgun-burst",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_BEAM_TELEGRAPH,
          executeTime: now + SUMMONER_BEAM_TELEGRAPH,
        };
      } else if (attackType === "summon") {
        boss.currentAttack = {
          type: "summon",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_PORTAL_TELEGRAPH,
          executeTime: now + SUMMONER_PORTAL_TELEGRAPH,
        };

        if (!boss.portals) boss.portals = [];
        const maxPortals = boss.isEnraged ? 5 : 3;
        const currentPortalCount = boss.portals.length;
        const portalsToSpawn = Math.min(
          SUMMONER_PORTAL_COUNT,
          maxPortals - currentPortalCount,
        );

        for (let i = 0; i < portalsToSpawn; i++) {
          const angle = (Math.PI * 2 * (currentPortalCount + i)) / maxPortals;
          const distance = 200;
          boss.portals.push({
            id: uuidv4(),
            position: {
              x: boss.position.x + Math.cos(angle) * distance,
              y: boss.position.y + Math.sin(angle) * distance,
            },
            health: SUMMONER_PORTAL_HEALTH,
            maxHealth: SUMMONER_PORTAL_HEALTH,
            spawnCooldown: 0,
            spawnInterval: SUMMONER_PORTAL_SPAWN_INTERVAL,
          });
        }
      } else if (attackType === "void-well") {
        boss.currentAttack = {
          type: "void-well",
          telegraphStartTime: now,
          telegraphDuration: 2000,
          executeTime: now + 2000,
          targetPosition: { ...boss.position },
        };
      } else if (attackType === "teleport") {
        // Teleport to random edge
        const edge = Math.floor(Math.random() * 4);
        let targetPos = { x: 0, y: 0 };

        switch (edge) {
          case 0: // top
            targetPos = { x: Math.random() * ARENA_WIDTH, y: 100 };
            break;
          case 1: // right
            targetPos = {
              x: ARENA_WIDTH - 100,
              y: Math.random() * ARENA_HEIGHT,
            };
            break;
          case 2: // bottom
            targetPos = {
              x: Math.random() * ARENA_WIDTH,
              y: ARENA_HEIGHT - 100,
            };
            break;
          case 3: // left
            targetPos = { x: 100, y: Math.random() * ARENA_HEIGHT };
            break;
        }

        boss.currentAttack = {
          type: "teleport",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_TELEPORT_TELEGRAPH,
          executeTime: now + SUMMONER_TELEPORT_TELEGRAPH,
          targetPosition: targetPos,
        };
      } else {
        // Beam attack
        const target = this.getNearestPlayer(state, boss.position);
        if (!target) return;

        const dx = target.position.x - boss.position.x;
        const dy = target.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;

        boss.currentAttack = {
          type: "beam",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_BEAM_TELEGRAPH,
          executeTime: now + SUMMONER_BEAM_TELEGRAPH,
          targetPosition: { ...target.position },
          direction: { x: dx / dist, y: dy / dist },
        };
      }
    } else if (boss.type === "architect") {
      // Choose attack: Laser Grid (40%), Floor Hazards (40%), Shield Phase (20% when phase 2)
      const rand = Math.random();
      let attackType: "laser-grid" | "floor-hazard" | "radial-burst";

      if (boss.isEnraged && rand < 0.2 && !boss.isInvulnerable) {
        // Shield phase - only in phase 2 and not already invulnerable
        boss.isInvulnerable = true;
        boss.shieldGenerators = [];

        // Spawn shield generators at corners
        const positions = [
          { x: 150, y: 150 },
          { x: ARENA_WIDTH - 150, y: 150 },
          { x: ARENA_WIDTH - 150, y: ARENA_HEIGHT - 150 },
          { x: 150, y: ARENA_HEIGHT - 150 },
        ];

        for (let i = 0; i < ARCHITECT_SHIELD_GENERATOR_COUNT; i++) {
          boss.shieldGenerators.push({
            id: uuidv4(),
            position: positions[i],
            health: ARCHITECT_SHIELD_GENERATOR_HEALTH,
            maxHealth: ARCHITECT_SHIELD_GENERATOR_HEALTH,
          });
        }

        // No attack during shield phase
        boss.attackCooldown = cooldown;
        return;
      }

      attackType =
        rand < 0.4
          ? "laser-grid"
          : rand < 0.8
            ? "floor-hazard"
            : "radial-burst";

      if (attackType === "laser-grid") {
        boss.currentAttack = {
          type: "laser-grid",
          telegraphStartTime: now,
          telegraphDuration: ARCHITECT_LASER_TELEGRAPH,
          executeTime: now + ARCHITECT_LASER_TELEGRAPH,
        };
      } else if (attackType === "radial-burst") {
        boss.currentAttack = {
          type: "radial-burst",
          telegraphStartTime: now,
          telegraphDuration: 1200,
          executeTime: now + 1200,
        };
      } else {
        // Floor hazards
        boss.currentAttack = {
          type: "floor-hazard",
          telegraphStartTime: now,
          telegraphDuration: ARCHITECT_FLOOR_HAZARD_TELEGRAPH,
          executeTime: now + ARCHITECT_FLOOR_HAZARD_TELEGRAPH,
        };
      }
    } else if (boss.type === "glitch-golem") {
      const target = this.getNearestPlayer(state, boss.position);
      if (!target) return;

      const rand = Math.random();
      if (!boss.isEnraged) {
        if (rand < 0.35) {
          boss.currentAttack = {
            type: "slam",
            telegraphStartTime: now,
            telegraphDuration: 1500,
            executeTime: now + 1500,
            targetPosition: { ...target.position },
            count: 1,
          };
        } else if (rand < 0.7) {
          boss.currentAttack = {
            type: "builder-drop",
            telegraphStartTime: now,
            telegraphDuration: GOLEM_BUILDER_DROP_TELEGRAPH,
            executeTime: now + GOLEM_BUILDER_DROP_TELEGRAPH,
            targetPosition: { ...target.position },
            count: 1,
          };
        } else {
          const dx = target.position.x - boss.position.x;
          const dy = target.position.y - boss.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          boss.currentAttack = {
            type: "shotgun-burst",
            telegraphStartTime: now,
            telegraphDuration: 900,
            executeTime: now + 900,
            targetPosition: { ...target.position },
            direction: { x: dx / dist, y: dy / dist },
            count: 1,
          };
        }
      } else if (rand < 0.28) {
        boss.currentAttack = {
          type: "glitch-zone",
          telegraphStartTime: now,
          telegraphDuration: 1000,
          executeTime: now + 1000,
          targetPosition: { ...boss.position },
        };
      } else if (rand < 0.55) {
        boss.currentAttack = {
          type: "system-collapse",
          telegraphStartTime: now,
          telegraphDuration: GOLEM_COLLAPSE_TELEGRAPH,
          executeTime: now + GOLEM_COLLAPSE_TELEGRAPH,
          targetPosition: { ...target.position },
          count: 0,
        };
      } else if (rand < 0.8) {
        boss.currentAttack = {
          type: "builder-drop",
          telegraphStartTime: now,
          telegraphDuration: 1120,
          executeTime: now + 1120,
          targetPosition: { ...target.position },
          count: 3,
        };
      } else {
        boss.currentAttack = {
          type: "slam",
          telegraphStartTime: now,
          telegraphDuration: 1400,
          executeTime: now + 1400,
          targetPosition: { ...target.position },
          count: 2,
        };
      }
    } else if (boss.type === "viral-swarm") {
      const target = this.getNearestPlayer(state, boss.position);
      if (!target) return;

      const dx = target.position.x - boss.position.x;
      const dy = target.position.y - boss.position.y;
      const dist = Math.hypot(dx, dy) || 1;

      const isBomb = boss.isEnraged && Math.random() < 0.4;
      boss.currentAttack = {
        type: isBomb
          ? "projectile-bomb"
          : boss.isEnraged
            ? "summon"
            : "viral-dash",
        telegraphStartTime: now,
        telegraphDuration: isBomb
          ? 1200
          : boss.isEnraged
            ? SWARM_CLOUD_TELEGRAPH
            : SWARM_DASH_TELEGRAPH,
        executeTime:
          now +
          (isBomb
            ? 1200
            : boss.isEnraged
              ? SWARM_CLOUD_TELEGRAPH
              : SWARM_DASH_TELEGRAPH),
        direction: { x: dx / dist, y: dy / dist },
        targetPosition: isBomb ? { ...target.position } : undefined,
      };
    } else if (boss.type === "overclocker") {
      // Overclocker: Clock Burst (rapid projectile spiral) or Time Slow (enraged)
      const attackType = boss.isEnraged ? "time-slow" : "clock-burst";
      const telegraphDuration = boss.isEnraged
        ? OVERCLOCKER_SLOW_TELEGRAPH
        : OVERCLOCKER_BURST_TELEGRAPH;

      boss.currentAttack = {
        type: attackType,
        telegraphStartTime: now,
        telegraphDuration: telegraphDuration,
        executeTime: now + telegraphDuration,
      };
    } else if (boss.type === "magnetic-magnus") {
      // Magnetic Magnus: Magnetic Flux (pull/push) or Magnetic Storm (enraged)
      const rand = Math.random();
      const attackType =
        boss.isEnraged && rand < 0.5 ? "magnetic-storm" : "magnetic-flux";
      const telegraphDuration =
        attackType === "magnetic-storm"
          ? MAGNUS_STORM_TELEGRAPH
          : MAGNUS_FLUX_TELEGRAPH;

      boss.currentAttack = {
        type: attackType,
        telegraphStartTime: now,
        telegraphDuration: telegraphDuration,
        executeTime: now + telegraphDuration,
        targetPosition: { ...boss.position }, // Centered on boss
      };
    } else if (boss.type === "neon-reaper") {
      // Neon Reaper: Choice of Stealth Dash or Decoys
      const rand = Math.random();
      if (rand < 0.6) {
        // Stealth Dash
        const target = this.getNearestPlayer(state, boss.position);
        if (!target) return;
        const dx = target.position.x - boss.position.x;
        const dy = target.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        boss.currentAttack = {
          type: "reaper-dash",
          telegraphStartTime: now,
          telegraphDuration: REAPER_DASH_TELEGRAPH,
          executeTime: now + REAPER_DASH_TELEGRAPH,
          targetPosition: { ...target.position },
          direction: { x: dx / dist, y: dy / dist },
        };
      } else {
        // Decoys
        boss.currentAttack = {
          type: boss.isEnraged ? "shotgun-burst" : "decoy-spawn",
          telegraphStartTime: now,
          telegraphDuration: 1000,
          executeTime: now + 1000,
        };
      }
    } else if (boss.type === "core-destroyer") {
      // Core Destroyer: Satellite Beam or Radial Burst
      boss.currentAttack = {
        type: boss.isEnraged ? "radial-burst" : "satellite-beam",
        telegraphStartTime: now,
        telegraphDuration: boss.isEnraged ? 2000 : CORE_BEAM_TELEGRAPH,
        executeTime: now + (boss.isEnraged ? 2000 : CORE_BEAM_TELEGRAPH),
      };
    }

    boss.attackCooldown = cooldown;
  }

  private updateBossAttack(
    state: GameState,
    boss: Boss,
    now: number,
    delta: number,
    timeFactor: number,
  ) {
    if (!boss.currentAttack) return;

    const attack = boss.currentAttack;

    if (attack.type === "charge") {
      // During telegraph, boss is stationary
      if (now < attack.executeTime!) return;

      // Execute charge
      if (!attack.targetPosition) {
        // First frame of charge - set end position
        const dirX = attack.direction?.x ?? 0;
        const dirY = attack.direction?.y ?? 0;
        const chargeDistance =
          BERSERKER_CHARGE_SPEED * (BERSERKER_CHARGE_DURATION / 1000);
        attack.targetPosition = {
          x: boss.position.x + dirX * chargeDistance,
          y: boss.position.y + dirY * chargeDistance,
        };
      }

      // Move boss
      const dirX = attack.direction?.x ?? 0;
      const dirY = attack.direction?.y ?? 0;
      boss.position.x += dirX * BERSERKER_CHARGE_SPEED * timeFactor;
      boss.position.y += dirY * BERSERKER_CHARGE_SPEED * timeFactor;

      // Clamp to arena
      boss.position.x = Math.max(
        40,
        Math.min(ARENA_WIDTH - 40, boss.position.x),
      );
      boss.position.y = Math.max(
        40,
        Math.min(ARENA_HEIGHT - 40, boss.position.y),
      );

      // Leave fire trail
      if (!state.fireTrails) state.fireTrails = [];
      state.fireTrails.push({
        id: uuidv4(),
        position: { ...boss.position },
        timestamp: now,
        radius: 30,
        damage: 5,
        ownerId: boss.id,
      });

      // Check collision with players
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dist = Math.hypot(
          p.position.x - boss.position.x,
          p.position.y - boss.position.y,
        );
        if (dist < 40 + 15) {
          const config = BOSS_CONFIGS[boss.type];
          const damage = Math.round(
            config.baseDamage *
              Math.pow(config.damageScaling, Math.floor(state.wave / 10) - 1),
          );
          this.damagePlayer(p, damage, now);
        }
      });

      // End charge or chain to next one if enraged
      if (now >= attack.executeTime! + BERSERKER_CHARGE_DURATION) {
        if (attack.count && attack.count > 1) {
          const target = this.getNearestPlayer(state, boss.position);
          if (target) {
            const dx = target.position.x - boss.position.x;
            const dy = target.position.y - boss.position.y;
            const dist = Math.hypot(dx, dy) || 1;
            attack.direction = { x: dx / dist, y: dy / dist };
            attack.executeTime = now + 400; // Shorter telegraph for follow-up
            attack.count--;
            attack.targetPosition = undefined; // Reset for next charge
          } else {
            boss.currentAttack = undefined;
          }
        } else {
          boss.currentAttack = undefined;
        }
      }
    } else if (attack.type === "slam") {
      if (now < attack.executeTime!) return;

      if (!state.shockwaveRings) state.shockwaveRings = [];

      if (now < attack.executeTime! + 100) {
        if (boss.type === "glitch-golem") {
          if (!attack.targetPosition) return;
          const ringCount = boss.isEnraged ? 5 : 3;
          for (let i = 0; i < ringCount; i++) {
            state.shockwaveRings.push({
              id: uuidv4(),
              position: { ...attack.targetPosition },
              currentRadius: i * (boss.isEnraged ? 20 : 24),
              maxRadius: boss.isEnraged ? 360 : 300,
              damage: boss.isEnraged ? 34 : 24,
              timestamp: now,
              speed: boss.isEnraged ? 260 : 220,
              hitPlayers: new Set(),
            });
          }
          this.triggerScreenShake(
            boss.isEnraged ? 22 : 14,
            boss.isEnraged ? 850 : 620,
          );
        } else {
          // Berserker Slam
          const rings = boss.isEnraged
            ? BERSERKER_ENRAGED_SLAM_RINGS
            : BERSERKER_SLAM_RINGS;
          for (let i = 0; i < rings; i++) {
            state.shockwaveRings.push({
              id: uuidv4(),
              position: { ...attack.targetPosition },
              currentRadius: i * BERSERKER_SLAM_RING_SPACING,
              maxRadius: 350,
              damage: BERSERKER_SLAM_DAMAGE,
              timestamp: now,
              speed: BERSERKER_SLAM_RING_SPEED,
              hitPlayers: new Set(),
            });
          }
          this.triggerScreenShake(10, 300);
        }
      }

      const duration = 500;
      if (now >= attack.executeTime! + duration) {
        if (attack.count && attack.count > 1) {
          const target = this.getNearestPlayer(state, boss.position);
          attack.targetPosition = target
            ? { ...target.position }
            : { ...boss.position };
          attack.executeTime = now + 800;
          attack.count--;
        } else {
          boss.currentAttack = undefined;
        }
      }
    } else if (attack.type === "summon") {
      if (boss.type === "viral-swarm") {
        if (now >= attack.executeTime! && now < attack.executeTime! + 100) {
          for (let i = 0; i < SWARM_ENRAGED_BIT_COUNT; i++) {
            const angle = (Math.PI * 2 * i) / SWARM_ENRAGED_BIT_COUNT;
            const pos = {
              x: boss.position.x + Math.cos(angle) * 60,
              y: boss.position.y + Math.sin(angle) * 60,
            };
            const bit = createEnemy(uuidv4(), pos, "mini-splitter", state.wave);
            bit.health = 50;
            bit.maxHealth = 50;
            bit.speed = 4;
            state.enemies.push(bit);
          }
          boss.currentAttack = undefined;
        }
      } else {
        if (now >= attack.executeTime!) {
          boss.currentAttack = undefined;
        }
      }
    } else if (attack.type === "teleport") {
      if (now >= attack.executeTime!) {
        boss.position = { ...attack.targetPosition! };
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "beam") {
      if (now < attack.executeTime!) return;
      if (!state.bossProjectiles) state.bossProjectiles = [];
      if (now < attack.executeTime! + 100) {
        const dirX = attack.direction?.x ?? 0;
        const dirY = attack.direction?.y ?? 0;
        state.bossProjectiles.push({
          id: uuidv4(),
          position: { ...boss.position },
          velocity: {
            x: dirX * SUMMONER_BEAM_SPEED * 100,
            y: dirY * SUMMONER_BEAM_SPEED * 100,
          },
          damage: SUMMONER_BEAM_DAMAGE,
          radius: 20,
          type: "beam",
          hitPlayers: new Set(),
        });
      }
      if (now >= attack.executeTime! + 500) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "laser-grid") {
      if (now < attack.executeTime!) return;
      const rotationSpeed =
        ARCHITECT_LASER_ROTATION_SPEED * (boss.isEnraged ? 1.5 : 1);
      const elapsed = (now - attack.executeTime!) / 1000;
      for (let i = 0; i < ARCHITECT_LASER_COUNT; i++) {
        const angle = (i * Math.PI) / 2 + elapsed * rotationSpeed;
        const laserLength = Math.max(ARENA_WIDTH, ARENA_HEIGHT);
        state.players.forEach((p) => {
          if (p.status !== "alive") return;
          const dx = p.position.x - boss.position.x;
          const dy = p.position.y - boss.position.y;
          const dist = Math.hypot(dx, dy);
          if (dist > laserLength) return;
          const playerAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(playerAngle - angle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);
          if (angleDiff < 0.1) {
            if (!p.lastHitTimestamp || now - p.lastHitTimestamp > 500) {
              this.damagePlayer(p, ARCHITECT_LASER_DAMAGE, now);
            }
          }
        });
      }
      if (now >= attack.executeTime! + 5000) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "floor-hazard") {
      if (now >= attack.executeTime! + 1000) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "viral-dash") {
      if (now < attack.executeTime!) return;
      const dirX = attack.direction?.x ?? 0;
      const dirY = attack.direction?.y ?? 0;
      boss.position.x += dirX * SWARM_DASH_SPEED * timeFactor;
      boss.position.y += dirY * SWARM_DASH_SPEED * timeFactor;
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dist = Math.hypot(
          p.position.x - boss.position.x,
          p.position.y - boss.position.y,
        );
        if (dist < 45) {
          const config = BOSS_CONFIGS[boss.type];
          this.damagePlayer(p, config.baseDamage, now);
        }
      });
      if (now >= attack.executeTime! + 500) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "void-well") {
      if (now < attack.executeTime!) return;
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dx = boss.position.x - p.position.x;
        const dy = boss.position.y - p.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 400) {
          const force =
            (1 - dist / 400) * SUMMONER_VOID_WELL_PULL_FORCE * timeFactor;
          p.position.x += (dx / dist) * force;
          p.position.y += (dy / dist) * force;
        }
      });
      if (now >= attack.executeTime! + 5000) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "clock-burst" || attack.type === "time-slow") {
      if (now < attack.executeTime!) return;
      if (boss.isEnraged) {
        state.players.forEach((p) => {
          if (p.status !== "alive") return;
          const dist = Math.hypot(
            p.position.x - boss.position.x,
            p.position.y - boss.position.y,
          );
          if (dist < OVERCLOCKER_TIME_SLOW_RADIUS) {
            if (!p.statusEffects) p.statusEffects = [];
            if (!p.statusEffects.some((se) => se.type === "slowed")) {
              p.statusEffects.push({
                type: "slowed",
                duration: 500,
                slowAmount: OVERCLOCKER_TIME_SLOW_FACTOR,
              });
            }
          }
        });
      }
      if (!state.bossProjectiles) state.bossProjectiles = [];
      const interval = boss.isEnraged ? 30 : 50;
      const elapsed = (now - attack.executeTime!) / interval;
      if (
        Math.floor(elapsed) !==
        Math.floor((now - attack.executeTime! - delta) / interval)
      ) {
        const burstAngle = elapsed * (boss.isEnraged ? 0.8 : 0.5);
        const config = BOSS_CONFIGS[boss.type];
        const damage = Math.round(config.baseDamage * 0.5);
        state.bossProjectiles.push({
          id: uuidv4(),
          position: { ...boss.position },
          velocity: {
            x: Math.cos(burstAngle) * 350,
            y: Math.sin(burstAngle) * 350,
          },
          damage,
          radius: 12,
          type: "beam",
          hitPlayers: new Set(),
        });
      }
      if (now >= attack.executeTime! + 2500) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "builder-drop") {
      if (now < attack.executeTime!) return;
      if (!attack.targetPosition) return;

      if (!attack.bombId) {
        const radius = boss.isEnraged
          ? GOLEM_BUILDER_DROP_RADIUS + 18
          : GOLEM_BUILDER_DROP_RADIUS;
        const damage =
          BOSS_CONFIGS[boss.type].baseDamage * (boss.isEnraged ? 2.25 : 1.8);
        this.spawnGolemBuilderCrash(state, attack.targetPosition, now, {
          radius,
          damage,
          burstCount: boss.isEnraged ? 10 : 6,
          burstSpeed: boss.isEnraged ? 340 : 280,
        });
        attack.bombId = uuidv4();
      }

      if (now >= attack.executeTime! + 180) {
        if (attack.count && attack.count > 1) {
          const target = this.getNearestPlayer(state, boss.position);
          const jitter = 25 + Math.random() * 90;
          const jitterAngle = Math.random() * Math.PI * 2;
          const nextTarget = target
            ? {
                x: target.position.x + Math.cos(jitterAngle) * jitter,
                y: target.position.y + Math.sin(jitterAngle) * jitter,
              }
            : { ...boss.position };
          attack.targetPosition = {
            x: Math.max(60, Math.min(ARENA_WIDTH - 60, nextTarget.x)),
            y: Math.max(60, Math.min(ARENA_HEIGHT - 60, nextTarget.y)),
          };
          attack.telegraphStartTime = now;
          attack.executeTime = now + GOLEM_BUILDER_DROP_CHAIN_DELAY;
          attack.bombId = undefined;
          attack.count--;
        } else {
          boss.currentAttack = undefined;
        }
      }
    } else if (attack.type === "glitch-zone") {
      if (now < attack.executeTime!) return;
      if (!state.bossProjectiles) state.bossProjectiles = [];

      const elapsed = now - attack.executeTime!;
      const zoneDuration =
        GOLEM_GLITCH_ZONE_DURATION + (boss.isEnraged ? 2000 : 0);
      const interval =
        GOLEM_GLITCH_ZONE_PROJECTILE_INTERVAL * (boss.isEnraged ? 0.78 : 1);
      const frame = Math.floor(elapsed / interval);
      const previousFrame = Math.floor((elapsed - delta) / interval);

      if (frame !== previousFrame) {
        const arms = boss.isEnraged ? 6 : 4;
        const angleOffset = frame % 2 === 0 ? 0 : Math.PI / arms;
        const baseAngle = elapsed * (boss.isEnraged ? 0.0056 : 0.0042);
        const projectileSpeed = boss.isEnraged ? 390 : 320;
        const damage =
          BOSS_CONFIGS[boss.type].baseDamage * (boss.isEnraged ? 0.44 : 0.34);
        for (let i = 0; i < arms; i++) {
          const angle = baseAngle + angleOffset + (Math.PI * 2 * i) / arms;
          state.bossProjectiles.push({
            id: uuidv4(),
            position: { ...boss.position },
            velocity: {
              x: Math.cos(angle) * projectileSpeed,
              y: Math.sin(angle) * projectileSpeed,
            },
            damage,
            radius: 11,
            type: "beam",
            hitPlayers: new Set(),
          });
        }
      }

      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dx = boss.position.x - p.position.x;
        const dy = boss.position.y - p.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > GOLEM_GLITCH_ZONE_RADIUS) return;
        const pullScale = 1 - dist / GOLEM_GLITCH_ZONE_RADIUS;
        const force = GOLEM_GLITCH_ZONE_PULL_FORCE * pullScale * timeFactor;
        p.position.x += (dx / dist) * force;
        p.position.y += (dy / dist) * force;
        p.position.x = Math.max(15, Math.min(ARENA_WIDTH - 15, p.position.x));
        p.position.y = Math.max(15, Math.min(ARENA_HEIGHT - 15, p.position.y));
      });

      if (now >= attack.executeTime! + zoneDuration) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "system-collapse") {
      if (now < attack.executeTime!) return;
      if (!attack.targetPosition) return;

      const elapsed = now - attack.executeTime!;
      const pulseInterval =
        GOLEM_COLLAPSE_PULSE_INTERVAL * (boss.isEnraged ? 0.78 : 1);
      const pulse = Math.floor(elapsed / pulseInterval);
      const prevPulse = Math.floor((elapsed - delta) / pulseInterval);
      const maxPulses = boss.isEnraged ? 6 : 4;

      if (pulse !== prevPulse && pulse < maxPulses) {
        const burstCount = boss.isEnraged ? 20 : 14;
        const speed = boss.isEnraged ? 430 : 350;
        const damage =
          BOSS_CONFIGS[boss.type].baseDamage * (boss.isEnraged ? 0.65 : 0.5);
        const baseOffset = pulse % 2 === 0 ? 0 : Math.PI / burstCount;
        this.spawnOffsetRadialBurst(
          state,
          attack.targetPosition,
          burstCount,
          speed,
          damage,
          baseOffset,
        );

        if (pulse === maxPulses - 1) {
          this.spawnGolemBuilderCrash(state, attack.targetPosition, now, {
            radius: boss.isEnraged
              ? GOLEM_BUILDER_DROP_RADIUS + 10
              : GOLEM_BUILDER_DROP_RADIUS - 10,
            damage:
              BOSS_CONFIGS[boss.type].baseDamage * (boss.isEnraged ? 2 : 1.6),
            burstCount: boss.isEnraged ? 12 : 8,
            burstSpeed: boss.isEnraged ? 360 : 300,
          });
        }

        this.triggerScreenShake(10 + pulse * 2, 220);
      }

      const collapseDuration = pulseInterval * maxPulses + 200;
      if (elapsed >= collapseDuration) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "magnetic-flux") {
      if (now < attack.executeTime!) return;
      const duration = MAGNUS_FLUX_DURATION;
      const elapsed = now - attack.executeTime!;
      const isPush = Math.floor(elapsed / 1000) % 2 === 0;
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dx = p.position.x - boss.position.x;
        const dy = p.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist > 600) return;
        const force = (isPush ? 1.5 : -1.5) * (1 - dist / 600) * 6 * timeFactor;
        p.position.x += (dx / dist) * force;
        p.position.y += (dy / dist) * force;
        p.position.x = Math.max(15, Math.min(ARENA_WIDTH - 15, p.position.x));
        p.position.y = Math.max(15, Math.min(ARENA_HEIGHT - 15, p.position.y));
      });
      if (now >= attack.executeTime! + duration) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "magnetic-storm") {
      if (now < attack.executeTime!) return;
      state.projectiles.forEach((proj) => {
        const dx = proj.position.x - boss.position.x;
        const dy = proj.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 300) {
          const force = (1 - dist / 300) * 10;
          proj.velocity.x += (dx / dist) * force;
          proj.velocity.y += (dy / dist) * force;
        }
      });
      if (now >= attack.executeTime! + 4000) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "reaper-dash") {
      if (now < attack.executeTime!) return;
      const dirX = attack.direction?.x ?? 0;
      const dirY = attack.direction?.y ?? 0;
      boss.position.x += dirX * 20 * timeFactor;
      boss.position.y += dirY * 20 * timeFactor;
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        const dist = Math.hypot(
          p.position.x - boss.position.x,
          p.position.y - boss.position.y,
        );
        if (dist < 50) {
          const config = BOSS_CONFIGS[boss.type];
          this.damagePlayer(p, config.baseDamage * 1.5, now);
        }
      });
      if (now >= attack.executeTime! + 400) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "decoy-spawn") {
      if (now >= attack.executeTime! && now < attack.executeTime! + 100) {
        if (!state.clones) state.clones = [];
        const count = boss.isEnraged
          ? REAPER_ENRAGED_DECOY_COUNT
          : REAPER_DECOY_COUNT;
        for (let i = 0; i < count; i++) {
          const decoyAngle = (Math.PI * 2 * i) / count;
          state.clones.push({
            id: uuidv4(),
            ownerId: boss.id,
            position: {
              x: boss.position.x + Math.cos(decoyAngle) * 120,
              y: boss.position.y + Math.sin(decoyAngle) * 120,
            },
            damage: 0.2,
            attackSpeed: 1500,
            attackCooldown: 0,
            range: 250,
            expiresAt: now + (boss.isEnraged ? 8000 : 5000),
            opacity: 0,
          });
        }
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "satellite-beam") {
      if (now < attack.executeTime!) return;
      if (!state.bossProjectiles) state.bossProjectiles = [];
      if (boss.isEnraged) {
        const elapsed = (now - attack.executeTime!) / 1000;
        for (let i = 0; i < CORE_SATELLITE_COUNT; i++) {
          const satAngle =
            (Math.PI * 2 * i) / CORE_SATELLITE_COUNT +
            elapsed * CORE_ENRAGED_ROTATION_SPEED;
          const dir = { x: Math.cos(satAngle), y: Math.sin(satAngle) };
          if (now % 200 < 50) {
            state.bossProjectiles.push({
              id: uuidv4(),
              position: {
                x: boss.position.x + dir.x * 120,
                y: boss.position.y + dir.y * 120,
              },
              velocity: { x: dir.x * 400, y: dir.y * 400 },
              damage: 20,
              radius: 15,
              type: "beam",
              hitPlayers: new Set(),
            });
          }
        }
        if (now >= attack.executeTime! + 5000) boss.currentAttack = undefined;
      } else {
        if (now < attack.executeTime! + 100) {
          for (let i = 0; i < CORE_SATELLITE_COUNT; i++) {
            const angle = (Math.PI * 2 * i) / CORE_SATELLITE_COUNT;
            const target = this.getNearestPlayer(state, boss.position);
            if (target) {
              const satPos = {
                x: boss.position.x + Math.cos(angle) * 150,
                y: boss.position.y + Math.sin(angle) * 150,
              };
              const dx = target.position.x - satPos.x;
              const dy = target.position.y - satPos.y;
              const dist = Math.hypot(dx, dy) || 1;
              state.bossProjectiles.push({
                id: uuidv4(),
                position: satPos,
                velocity: { x: (dx / dist) * 500, y: (dy / dist) * 500 },
                damage: 25,
                radius: 20,
                type: "beam",
                hitPlayers: new Set(),
              });
            }
          }
        }
        if (now >= attack.executeTime! + 500) boss.currentAttack = undefined;
      }
    } else if (attack.type === "shotgun-burst") {
      if (now < attack.executeTime!) return;
      if (now < attack.executeTime! + 100) {
        const config = BOSS_CONFIGS[boss.type];
        const damage = config.baseDamage * (boss.isEnraged ? 0.8 : 0.6);
        const speed = 400;

        if (boss.type === "berserker") {
          const target = this.getNearestPlayer(state, boss.position);
          if (target) {
            const dx = target.position.x - boss.position.x;
            const dy = target.position.y - boss.position.y;
            const dist = Math.hypot(dx, dy) || 1;
            this.spawnShotgunBurst(
              state,
              boss.position,
              { x: dx / dist, y: dy / dist },
              SHOTGUN_PROJECTILE_COUNT,
              SHOTGUN_CONE_ANGLE,
              speed,
              damage,
            );
          }
        } else if (boss.type === "summoner") {
          if (boss.portals) {
            boss.portals.forEach((portal) => {
              const target = this.getNearestPlayer(state, portal.position);
              if (target) {
                const dx = target.position.x - portal.position.x;
                const dy = target.position.y - portal.position.y;
                const dist = Math.hypot(dx, dy) || 1;
                this.spawnShotgunBurst(
                  state,
                  portal.position,
                  { x: dx / dist, y: dy / dist },
                  3,
                  Math.PI / 6,
                  speed,
                  damage * 0.5,
                );
              }
            });
          }
        } else if (boss.type === "neon-reaper") {
          if (state.clones) {
            state.clones
              .filter((c) => c.ownerId === boss.id)
              .forEach((clone) => {
                const target = this.getNearestPlayer(state, clone.position);
                if (target) {
                  const dx = target.position.x - clone.position.x;
                  const dy = target.position.y - clone.position.y;
                  const dist = Math.hypot(dx, dy) || 1;
                  this.spawnShotgunBurst(
                    state,
                    clone.position,
                    { x: dx / dist, y: dy / dist },
                    3,
                    Math.PI / 8,
                    speed * 1.2,
                    damage * 0.4,
                  );
                }
              });
          }
        } else if (boss.type === "glitch-golem") {
          const target = this.getNearestPlayer(state, boss.position);
          const direction =
            attack.direction &&
            (Math.abs(attack.direction.x) > 0 ||
              Math.abs(attack.direction.y) > 0)
              ? attack.direction
              : target
                ? {
                    x:
                      (target.position.x - boss.position.x) /
                      (Math.hypot(
                        target.position.x - boss.position.x,
                        target.position.y - boss.position.y,
                      ) || 1),
                    y:
                      (target.position.y - boss.position.y) /
                      (Math.hypot(
                        target.position.x - boss.position.x,
                        target.position.y - boss.position.y,
                      ) || 1),
                  }
                : { x: 1, y: 0 };
          const rotateDir = (dir: Vector2D, radians: number): Vector2D => ({
            x: dir.x * Math.cos(radians) - dir.y * Math.sin(radians),
            y: dir.x * Math.sin(radians) + dir.y * Math.cos(radians),
          });

          this.spawnShotgunBurst(
            state,
            boss.position,
            direction,
            boss.isEnraged ? 9 : 7,
            boss.isEnraged ? Math.PI * 0.9 : Math.PI * 0.75,
            boss.isEnraged ? speed * 1.08 : speed,
            damage * 0.75,
          );

          if (boss.isEnraged) {
            this.spawnShotgunBurst(
              state,
              boss.position,
              rotateDir(direction, Math.PI / 3),
              6,
              Math.PI * 0.55,
              speed * 1.1,
              damage * 0.55,
            );
            this.spawnShotgunBurst(
              state,
              boss.position,
              rotateDir(direction, -Math.PI / 3),
              6,
              Math.PI * 0.55,
              speed * 1.1,
              damage * 0.55,
            );
          }
        }
      }
      if (now >= attack.executeTime! + 200) boss.currentAttack = undefined;
    } else if (attack.type === "radial-burst") {
      if (now < attack.executeTime!) return;
      if (now < attack.executeTime! + 100) {
        const config = BOSS_CONFIGS[boss.type];
        const damage = config.baseDamage * 0.7;
        const speed = 350;

        if (boss.type === "architect") {
          this.spawnRadialBurst(
            state,
            boss.position,
            RADIAL_PROJECTILE_COUNT,
            speed,
            damage,
          );
        } else if (boss.type === "core-destroyer") {
          const dist = 120;
          for (let i = 0; i < CORE_SATELLITE_COUNT; i++) {
            const angle = (Math.PI * 2 * i) / CORE_SATELLITE_COUNT;
            const satPos = {
              x: boss.position.x + Math.cos(angle) * dist,
              y: boss.position.y + Math.sin(angle) * dist,
            };
            this.spawnRadialBurst(state, satPos, 6, speed * 0.8, damage * 0.5);
          }
        } else if (boss.type === "glitch-golem") {
          const burstCount = boss.isEnraged ? 18 : 12;
          this.spawnOffsetRadialBurst(
            state,
            boss.position,
            burstCount,
            boss.isEnraged ? speed * 1.15 : speed,
            damage * 0.8,
            boss.isEnraged ? Math.PI / burstCount : 0,
          );
        }
      }
      if (now >= attack.executeTime! + 200) boss.currentAttack = undefined;
    } else if (attack.type === "projectile-bomb") {
      if (now < attack.executeTime!) return;
      if (!attack.bombId) {
        attack.bombId = uuidv4();
        if (!state.bossProjectiles) state.bossProjectiles = [];

        if (!attack.targetPosition) return;
        const dx = attack.targetPosition.x - boss.position.x;
        const dy = attack.targetPosition.y - boss.position.y;
        const dist = Math.hypot(dx, dy) || 1;

        state.bossProjectiles.push({
          id: attack.bombId,
          position: { ...boss.position },
          velocity: {
            x: (dx / dist) * 500,
            y: (dy / dist) * 500,
          },
          damage: 20,
          radius: 20,
          type: "bomb",
          hitPlayers: new Set(),
        });
        attack.executeTime = now + PROJECTILE_BOMB_DELAY;
      } else {
        if (now >= attack.executeTime!) {
          const bomb = state.bossProjectiles?.find(
            (p) => p.id === attack.bombId,
          );
          if (bomb) {
            this.spawnRadialBurst(
              state,
              bomb.position,
              16,
              400,
              BOSS_CONFIGS[boss.type].baseDamage,
            );
            this.triggerScreenShake(15, 500);
            state.bossProjectiles = state.bossProjectiles?.filter(
              (p) => p.id !== attack.bombId,
            );
          }

          if (attack.count && attack.count > 1) {
            const target = this.getNearestPlayer(state, boss.position);
            attack.targetPosition = target
              ? { ...target.position }
              : { ...boss.position };
            attack.bombId = undefined;
            attack.executeTime = now + 700;
            attack.count--;
          } else {
            boss.currentAttack = undefined;
          }
        }
      }
    }
  }

  private spawnGolemBuilderCrash(
    state: GameState,
    position: Vector2D,
    now: number,
    options?: {
      radius?: number;
      damage?: number;
      burstCount?: number;
      burstSpeed?: number;
    },
  ) {
    const clamp = (value: number, min: number, max: number) =>
      Math.max(min, Math.min(max, value));
    const safePosition = {
      x: clamp(position.x, 70, ARENA_WIDTH - 70),
      y: clamp(position.y, 70, ARENA_HEIGHT - 70),
    };
    const radius = options?.radius ?? GOLEM_BUILDER_DROP_RADIUS;
    const damage =
      options?.damage ?? BOSS_CONFIGS["glitch-golem"].baseDamage * 1.8;

    if (!state.explosions) state.explosions = [];
    state.explosions.push({
      id: uuidv4(),
      position: safePosition,
      radius,
      timestamp: now,
      damage,
      ownerId: "boss",
      type: "normal",
    });

    state.players.forEach((p) => {
      if (p.status !== "alive") return;
      const dist = Math.hypot(
        p.position.x - safePosition.x,
        p.position.y - safePosition.y,
      );
      if (dist >= radius) return;
      const hitFalloff = 0.72 + 0.28 * (1 - dist / radius);
      this.damagePlayer(p, damage * hitFalloff, now);
    });

    const burstCount = options?.burstCount ?? 6;
    const burstSpeed = options?.burstSpeed ?? 280;
    this.spawnOffsetRadialBurst(
      state,
      safePosition,
      burstCount,
      burstSpeed,
      BOSS_CONFIGS["glitch-golem"].baseDamage * 0.35,
      Math.PI / Math.max(1, burstCount),
    );

    this.spawnParticles(safePosition, "#FF8F4D", 26, "glitch", 18);
    this.triggerScreenShake(14, 360);
  }

  private spawnOffsetRadialBurst(
    state: GameState,
    position: Vector2D,
    count: number,
    speed: number,
    damage: number,
    angleOffset: number = 0,
    type: "beam" | "hazard" = "beam",
  ) {
    if (!state.bossProjectiles) state.bossProjectiles = [];
    for (let i = 0; i < count; i++) {
      const angle = angleOffset + (Math.PI * 2 * i) / count;
      state.bossProjectiles.push({
        id: uuidv4(),
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        damage,
        radius: 12,
        type,
        hitPlayers: new Set(),
      });
    }
  }

  private spawnShotgunBurst(
    state: GameState,
    position: Vector2D,
    direction: Vector2D,
    count: number,
    coneAngle: number,
    speed: number,
    damage: number,
    type: "beam" | "hazard" = "beam",
  ) {
    if (!state.bossProjectiles) state.bossProjectiles = [];
    const baseAngle = Math.atan2(direction.y, direction.x);
    const startAngle = baseAngle - coneAngle / 2;
    const angleStep = count > 1 ? coneAngle / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * angleStep;
      state.bossProjectiles.push({
        id: uuidv4(),
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        damage,
        radius: 15,
        type,
        hitPlayers: new Set(),
      });
    }
  }

  private spawnRadialBurst(
    state: GameState,
    position: Vector2D,
    count: number,
    speed: number,
    damage: number,
    type: "beam" | "hazard" = "beam",
  ) {
    this.spawnOffsetRadialBurst(state, position, count, speed, damage, 0, type);
  }

  private bossChasePlayer(state: GameState, boss: Boss, timeFactor: number) {
    const target = this.getNearestPlayer(state, boss.position);
    if (!target) return;

    const dx = target.position.x - boss.position.x;
    const dy = target.position.y - boss.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 50) {
      // Don't chase if too close
      const config = BOSS_CONFIGS[boss.type];
      const speed = config.baseSpeed * (boss.isEnraged ? 1.5 : 1);
      boss.position.x += (dx / dist) * speed * timeFactor;
      boss.position.y += (dy / dist) * speed * timeFactor;
    }
  }

  private getNearestPlayer(
    state: GameState,
    position: { x: number; y: number },
  ) {
    const alivePlayers = state.players.filter((p) => p.status === "alive");
    if (alivePlayers.length === 0) return null;

    let nearest = alivePlayers[0];
    let minDist = Math.hypot(
      nearest.position.x - position.x,
      nearest.position.y - position.y,
    );

    for (let i = 1; i < alivePlayers.length; i++) {
      const dist = Math.hypot(
        alivePlayers[i].position.x - position.x,
        alivePlayers[i].position.y - position.y,
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = alivePlayers[i];
      }
    }

    return nearest;
  }

  private updateShockwaveRings(state: GameState, delta: number) {
    if (!state.shockwaveRings) return;

    const now = Date.now();

    state.shockwaveRings.forEach((ring) => {
      // Expand ring
      ring.currentRadius += ring.speed * (delta / 1000);

      // Check collision with players
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        if (ring.hitPlayers?.has(p.id)) return; // Already hit

        const dist = Math.hypot(
          p.position.x - ring.position.x,
          p.position.y - ring.position.y,
        );
        const ringThickness = 20; // Hit zone thickness

        if (Math.abs(dist - ring.currentRadius) < ringThickness) {
          // Hit player
          this.damagePlayer(p, ring.damage, now);
          if (!ring.hitPlayers) ring.hitPlayers = new Set();
          ring.hitPlayers.add(p.id);
        }
      });
    });

    // Remove rings that have expanded beyond max radius
    state.shockwaveRings = state.shockwaveRings.filter(
      (ring) => ring.currentRadius < ring.maxRadius,
    );
  }

  private updateBossProjectiles(state: GameState, delta: number) {
    if (!state.bossProjectiles) return;

    const now = Date.now();
    const projectilesToRemove = new Set<string>();

    state.bossProjectiles.forEach((projectile) => {
      // Move projectile
      projectile.position.x += projectile.velocity.x * (delta / 1000);
      projectile.position.y += projectile.velocity.y * (delta / 1000);

      // Check collision with players
      state.players.forEach((p) => {
        if (p.status !== "alive") return;
        if (projectile.hitPlayers?.has(p.id)) return; // Already hit

        const dist = Math.hypot(
          p.position.x - projectile.position.x,
          p.position.y - projectile.position.y,
        );

        if (dist < projectile.radius + 20) {
          // Player radius ~20
          // Reflect logic
          if (p.hasReflect && Math.random() < 0.5) {
            projectile.velocity.x *= -1.5;
            projectile.velocity.y *= -1.5;
            if (!projectile.hitPlayers) projectile.hitPlayers = new Set();
            projectile.hitPlayers.add(p.id); // Don't hit self immediately
            this.spawnParticles(p.position, "#00FFFF", 5, "pixel");
            return;
          }

          // Hit player
          this.damagePlayer(p, projectile.damage, now);
          if (!projectile.hitPlayers) projectile.hitPlayers = new Set();
          projectile.hitPlayers.add(p.id);

          // Mark projectile for removal after hitting a player
          projectilesToRemove.add(projectile.id);
        }
      });
    });

    // Remove projectiles that hit players or are out of bounds
    state.bossProjectiles = state.bossProjectiles.filter((proj) => {
      const isOut =
        proj.position.x < -100 ||
        proj.position.x > ARENA_WIDTH + 100 ||
        proj.position.y < -100 ||
        proj.position.y > ARENA_HEIGHT + 100;

      return !projectilesToRemove.has(proj.id) && !isOut;
    });
  }

  continueAfterBoss() {
    const state = this.gameState;
    if (state.status !== "bossDefeated") return;

    // Remove teleporter
    state.teleporter = null;

    // Resume normal gameplay
    state.status = "playing";
    state.wave++;
    state.waveTimer = 0;

    // Grant reward - legendary upgrade choice
    const player = state.players.find((p) => p.status === "alive");
    if (player) {
      const legendaryUpgrades = getRandomUpgrades(3, "legendary");
      this.openUpgradePrompt(
        player.id,
        legendaryUpgrades.map((o) => ({
          ...o,
          id: uuidv4(),
          source: "levelUp" as const,
        })),
      );
    }

    state.bossDefeatedRewardClaimed = true;
    this.markStateDirty();
  }

  extract() {
    const state = this.gameState;
    if (state.status !== "bossDefeated") return;

    // Trigger victory
    state.status = "won";

    // Final save of stats
    this.saveGameStats(state);
    this.markStateDirty();
  }

  private updateAbilities(state: GameState, delta: number) {
    state.players.forEach((p) => {
      if (p.abilityCooldown && p.abilityCooldown > 0) {
        p.abilityCooldown -= delta;
      }
      if (p.isAbilityActive && p.abilityDuration !== undefined) {
        p.abilityDuration -= delta;
        if (p.abilityDuration <= 0) {
          p.isAbilityActive = false;
          p.abilityDuration = 0;
        }
      }
    });

    // Time Warp effect for Dash Dynamo
    const dashDynamo = state.players.find(
      (p) => p.characterType === "dash-dynamo" && p.isAbilityActive,
    );
    if (dashDynamo) {
      state.enemies.forEach((e) => {
        if (!e.statusEffects) e.statusEffects = [];
        if (!e.statusEffects.some((s) => s.type === "slowed")) {
          e.statusEffects.push({
            type: "slowed",
            slowAmount: 0.7,
            duration: 100,
          });
        }
      });
      if (state.boss) {
        // Boss slowing logic could be added here
      }
    }
  }

  private updateHazards(state: GameState, now: number, delta: number) {
    if (!state.hazards) state.hazards = [];
    const SPIKE_ACTIVE_MS = 1150;
    const SPIKE_WALL_RADIUS = 56;
    const SPIKE_SLAM_RADIUS = 190;
    const SPIKE_SLAM_DAMAGE = 65;
    const SPIKE_SLAM_KNOCKBACK = 90;
    const SPIKE_ACTIVATION_RADIUS = 130;
    const SPIKE_ACTIVATION_THRESHOLD = 1050;
    const TNT_EXPLOSION_RADIUS = 170;
    const TNT_CHAIN_RADIUS = 270;
    const TNT_KNOCKBACK_RADIUS = 230;
    const TNT_KNOCKBACK_FORCE = 72;
    const TNT_ACTIVATION_RADIUS = 112;
    const TNT_ACTIVATION_THRESHOLD = 950;
    const ICE_BURST_RADIUS = 220;
    const ICE_ZONE_DURATION = 13500;
    const ICE_ZONE_RADIUS = 225;
    const ICE_ACTIVATION_RADIUS = 122;
    const ICE_ACTIVATION_THRESHOLD = 900;

    const applyEnemyEffect = (
      enemy: Enemy,
      type: "frozen" | "slowed",
      slowAmount: number,
      duration: number,
    ) => {
      if (!enemy.statusEffects) enemy.statusEffects = [];
      const existing = enemy.statusEffects.find(
        (effect) => effect.type === type,
      );
      if (existing) {
        existing.duration = Math.max(existing.duration, duration);
        existing.slowAmount = existing.slowAmount
          ? Math.min(existing.slowAmount, slowAmount)
          : slowAmount;
      } else {
        enemy.statusEffects.push({
          type,
          duration,
          slowAmount,
        });
      }
    };

    // Proximity activation: players stand near hazards to charge and trigger them.
    state.hazards.forEach((hazard) => {
      if (hazard.variant === "zone") return;

      if (hazard.type === "spike-trap") {
        if (!hazard.variant) hazard.variant = "wall";
        if (!hazard.radius) hazard.radius = SPIKE_WALL_RADIUS;
        if (!hazard.activationRadius)
          hazard.activationRadius = SPIKE_ACTIVATION_RADIUS;
        if (!hazard.activationThreshold)
          hazard.activationThreshold = SPIKE_ACTIVATION_THRESHOLD;
      } else if (hazard.type === "explosive-barrel") {
        if (!hazard.variant) hazard.variant = "barrel";
        if (!hazard.activationRadius)
          hazard.activationRadius = TNT_ACTIVATION_RADIUS;
        if (!hazard.activationThreshold)
          hazard.activationThreshold = TNT_ACTIVATION_THRESHOLD;
      } else if (hazard.type === "freeze-barrel") {
        if (!hazard.variant) hazard.variant = "barrel";
        if (!hazard.activationRadius)
          hazard.activationRadius = ICE_ACTIVATION_RADIUS;
        if (!hazard.activationThreshold)
          hazard.activationThreshold = ICE_ACTIVATION_THRESHOLD;
      }
      if (hazard.activationCharge === undefined) hazard.activationCharge = 0;

      const activationRadius = hazard.activationRadius || 110;
      const activationThreshold = hazard.activationThreshold || 1000;
      const hasChargingPlayer = state.players.some(
        (player) =>
          player.status === "alive" &&
          Math.hypot(
            player.position.x - hazard.position.x,
            player.position.y - hazard.position.y,
          ) < activationRadius,
      );

      if (hasChargingPlayer) {
        hazard.activationCharge = Math.min(
          activationThreshold,
          hazard.activationCharge + delta,
        );
      } else {
        hazard.activationCharge = Math.max(
          0,
          hazard.activationCharge - delta * 0.75,
        );
      }

      if (hazard.type === "spike-trap") {
        if (
          !hazard.isActive &&
          hazard.activationCharge >= activationThreshold
        ) {
          hazard.isActive = true;
          hazard.lastToggle = now;
          hazard.activeUntil = now + SPIKE_ACTIVE_MS;
          hazard.lastSlamAt = now - 1;
          hazard.activationCharge = 0;
          this.triggerScreenShake(6, 170);
          this.spawnParticles(hazard.position, "#FF5A45", 16, "glitch", 12);
        }
      } else if (hazard.activationCharge >= activationThreshold) {
        hazard.activationCharge = 0;
        hazard.health = 0;
      }
    });

    // Spike walls: once activated they slam and block movement/projectiles.
    state.hazards.forEach((hazard) => {
      if (hazard.type !== "spike-trap" || !hazard.isActive) return;

      if (hazard.activeUntil && now >= hazard.activeUntil) {
        hazard.isActive = false;
        return;
      }

      if (!hazard.lastSlamAt || hazard.lastSlamAt < (hazard.lastToggle || 0)) {
        hazard.lastSlamAt = now;
        state.enemies.forEach((enemy) => {
          const dx = enemy.position.x - hazard.position.x;
          const dy = enemy.position.y - hazard.position.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist > SPIKE_SLAM_RADIUS) return;

          const slamScale = 1 - dist / SPIKE_SLAM_RADIUS;
          enemy.health -= SPIKE_SLAM_DAMAGE * (0.5 + slamScale * 0.5);
          enemy.lastHitTimestamp = now;
          enemy.position.x += (dx / dist) * SPIKE_SLAM_KNOCKBACK * slamScale;
          enemy.position.y += (dy / dist) * SPIKE_SLAM_KNOCKBACK * slamScale;
        });
      }

      state.enemies.forEach((enemy) => {
        const dx = enemy.position.x - hazard.position.x;
        const dy = enemy.position.y - hazard.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        const radius = hazard.radius || SPIKE_WALL_RADIUS;
        if (dist >= radius) return;
        const push = radius - dist + 1;
        enemy.position.x += (dx / dist) * push;
        enemy.position.y += (dy / dist) * push;
      });
    });

    // Ice zones: slow enemies and help players reposition while active.
    state.hazards.forEach((hazard) => {
      if (
        hazard.type !== "freeze-barrel" ||
        hazard.variant !== "zone" ||
        hazard.zoneUntil === undefined ||
        hazard.zoneUntil <= now
      ) {
        return;
      }

      const zoneRadius = hazard.radius || ICE_ZONE_RADIUS;
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - hazard.position.x,
          enemy.position.y - hazard.position.y,
        );
        if (dist >= zoneRadius) return;
        applyEnemyEffect(enemy, "slowed", 0.5, 840);
        if (dist < zoneRadius * 0.45) {
          applyEnemyEffect(enemy, "frozen", 0.2, 540);
        }
      });
    });

    state.hazards.forEach((hazard) => {
      if (
        hazard.type !== "pulse-zone" ||
        hazard.zoneUntil === undefined ||
        hazard.zoneUntil <= now
      ) {
        return;
      }

      if (
        hazard.lastToggle !== undefined &&
        now - hazard.lastToggle < NEON_PULSE_ZONE_DAMAGE_INTERVAL_MS
      ) {
        return;
      }

      hazard.lastToggle = now;
      const zoneRadius = hazard.radius || 175;
      const zoneDamage = hazard.damage || NEON_PULSE_ZONE_DAMAGE;

      state.players.forEach((player) => {
        if (player.status !== "alive") return;
        const dx = player.position.x - hazard.position.x;
        const dy = player.position.y - hazard.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= zoneRadius) return;
        this.damagePlayer(player, zoneDamage, now);
        this.pushPlayer(player, { x: dx, y: dy }, 18);
        this.spawnParticles(player.position, "#52F7FF", 4, "pixel", 4);
      });
    });

    // Spawn hazards occasionally; keep count/chance low for readability.
    const maxHazards = state.wave >= 15 ? 5 : state.wave >= 8 ? 4 : 3;
    const hazardSpawnChance =
      state.wave >= 15 ? 0.0018 : state.wave >= 8 ? 0.0014 : 0.001;

    if (
      state.hazards.length < maxHazards &&
      Math.random() < hazardSpawnChance
    ) {
      const rand = Math.random();
      const type: HazardType =
        rand < 0.45
          ? "explosive-barrel"
          : rand < 0.8
            ? "freeze-barrel"
            : "spike-trap";

      let spawnPosition = {
        x: 100 + Math.random() * (ARENA_WIDTH - 200),
        y: 100 + Math.random() * (ARENA_HEIGHT - 200),
      };
      // Try a few times to avoid popping hazards directly under players.
      for (let i = 0; i < 6; i++) {
        const candidate = {
          x: 100 + Math.random() * (ARENA_WIDTH - 200),
          y: 100 + Math.random() * (ARENA_HEIGHT - 200),
        };
        const isNearAlivePlayer = state.players.some(
          (p) =>
            p.status === "alive" &&
            Math.hypot(p.position.x - candidate.x, p.position.y - candidate.y) <
              140,
        );
        if (!isNearAlivePlayer) {
          spawnPosition = candidate;
          break;
        }
      }

      state.hazards.push({
        id: uuidv4(),
        position: spawnPosition,
        type,
        variant: type === "spike-trap" ? "wall" : "barrel",
        radius:
          type === "spike-trap"
            ? SPIKE_WALL_RADIUS
            : type === "freeze-barrel"
              ? ICE_ZONE_RADIUS
              : TNT_EXPLOSION_RADIUS,
        damage: type === "spike-trap" ? SPIKE_SLAM_DAMAGE : undefined,
        activationRadius:
          type === "spike-trap"
            ? SPIKE_ACTIVATION_RADIUS
            : type === "freeze-barrel"
              ? ICE_ACTIVATION_RADIUS
              : TNT_ACTIVATION_RADIUS,
        activationThreshold:
          type === "spike-trap"
            ? SPIKE_ACTIVATION_THRESHOLD
            : type === "freeze-barrel"
              ? ICE_ACTIVATION_THRESHOLD
              : TNT_ACTIVATION_THRESHOLD,
        activationCharge: 0,
        health: type === "spike-trap" ? 9999 : 20,
        maxHealth: type === "spike-trap" ? 9999 : 20,
        isActive: false,
        lastToggle: now,
      });
    }

    // Hazard collision with projectiles.
    state.projectiles = state.projectiles.filter((proj) => {
      for (const hazard of state.hazards!) {
        const dist = Math.hypot(
          proj.position.x - hazard.position.x,
          proj.position.y - hazard.position.y,
        );

        if (
          hazard.type === "spike-trap" &&
          hazard.isActive &&
          dist < (hazard.radius || SPIKE_WALL_RADIUS)
        ) {
          this.spawnParticles(proj.position, "#9A9A9A", 4, "pixel");
          return false;
        }

        // Barrels are proximity-triggered now, not shot-triggered.
      }
      return true;
    });

    // Active spike walls can also block boss projectiles.
    if (state.bossProjectiles && state.bossProjectiles.length > 0) {
      state.bossProjectiles = state.bossProjectiles.filter((proj) => {
        for (const hazard of state.hazards!) {
          if (hazard.type !== "spike-trap" || !hazard.isActive) {
            continue;
          }
          const dist = Math.hypot(
            proj.position.x - hazard.position.x,
            proj.position.y - hazard.position.y,
          );
          if (dist < (hazard.radius || SPIKE_WALL_RADIUS) + proj.radius * 0.7) {
            this.spawnParticles(proj.position, "#7A7A7A", 5, "pixel");
            return false;
          }
        }
        return true;
      });
    }

    // Resolve destruction and tactical effects.
    const hazardsToRemove = new Set<string>();
    const hazardsToAdd: Hazard[] = [];
    const explosiveQueue: Hazard[] = [];
    const detonatedExplosives = new Set<string>();

    state.hazards.forEach((hazard) => {
      if (
        hazard.type === "spike-trap" &&
        hazard.zoneUntil !== undefined &&
        now >= hazard.zoneUntil
      ) {
        hazardsToRemove.add(hazard.id);
        return;
      }

      if (
        hazard.type === "freeze-barrel" &&
        hazard.variant === "zone" &&
        hazard.zoneUntil !== undefined &&
        now >= hazard.zoneUntil
      ) {
        hazardsToRemove.add(hazard.id);
        return;
      }

      if (
        hazard.type === "pulse-zone" &&
        hazard.zoneUntil !== undefined &&
        now >= hazard.zoneUntil
      ) {
        hazardsToRemove.add(hazard.id);
        return;
      }

      if (hazard.health > 0) return;

      if (hazard.type === "explosive-barrel") {
        explosiveQueue.push(hazard);
        return;
      }

      if (hazard.type === "freeze-barrel") {
        hazardsToRemove.add(hazard.id);
        state.enemies.forEach((enemy) => {
          const dist = Math.hypot(
            enemy.position.x - hazard.position.x,
            enemy.position.y - hazard.position.y,
          );
          if (dist < ICE_BURST_RADIUS) {
            applyEnemyEffect(enemy, "frozen", 0.12, 4500);
            applyEnemyEffect(enemy, "slowed", 0.4, 6600);
          }
        });
        hazardsToAdd.push({
          id: uuidv4(),
          position: { ...hazard.position },
          type: "freeze-barrel",
          variant: "zone",
          health: 9999,
          maxHealth: 9999,
          isActive: true,
          radius: ICE_ZONE_RADIUS,
          activationRadius: 0,
          activationThreshold: 0,
          activationCharge: 0,
          zoneUntil: now + ICE_ZONE_DURATION,
          lastToggle: now,
        });
        this.spawnParticles(hazard.position, "#00E6FF", 45, "nebula", 12);
        return;
      }

      hazardsToRemove.add(hazard.id);
    });

    while (explosiveQueue.length > 0) {
      const explosive = explosiveQueue.shift()!;
      if (detonatedExplosives.has(explosive.id)) continue;
      detonatedExplosives.add(explosive.id);
      hazardsToRemove.add(explosive.id);

      if (!state.explosions) state.explosions = [];
      state.explosions.push({
        id: uuidv4(),
        position: { ...explosive.position },
        radius: TNT_EXPLOSION_RADIUS,
        timestamp: now,
        damage: 110,
        ownerId: "hazard",
      });

      state.enemies.forEach((enemy) => {
        const dx = enemy.position.x - explosive.position.x;
        const dy = enemy.position.y - explosive.position.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist >= TNT_KNOCKBACK_RADIUS) return;
        const pushScale = 1 - dist / TNT_KNOCKBACK_RADIUS;
        enemy.position.x += (dx / dist) * TNT_KNOCKBACK_FORCE * pushScale;
        enemy.position.y += (dy / dist) * TNT_KNOCKBACK_FORCE * pushScale;
      });

      if (!state.fireTrails) state.fireTrails = [];
      const firePatchOffsets = [
        { x: 0, y: 0 },
        { x: 58, y: 0 },
        { x: -58, y: 0 },
        { x: 0, y: 58 },
        { x: 0, y: -58 },
        { x: 42, y: 42 },
        { x: -42, y: 42 },
        { x: 42, y: -42 },
        { x: -42, y: -42 },
      ];
      firePatchOffsets.forEach((offset) => {
        state.fireTrails!.push({
          id: uuidv4(),
          position: {
            x: explosive.position.x + offset.x,
            y: explosive.position.y + offset.y,
          },
          timestamp: now,
          radius: 42,
          damage: 56,
          ownerId: "hazard",
        });
      });

      state.hazards.forEach((candidate) => {
        if (candidate.type !== "explosive-barrel") return;
        if (detonatedExplosives.has(candidate.id)) return;
        const dist = Math.hypot(
          candidate.position.x - explosive.position.x,
          candidate.position.y - explosive.position.y,
        );
        if (dist < TNT_CHAIN_RADIUS) {
          explosiveQueue.push(candidate);
        }
      });

      this.triggerScreenShake(15, 400);
      this.spawnParticles(explosive.position, "#FF5500", 30, "glitch", 15);
    }

    if (hazardsToAdd.length > 0) {
      state.hazards.push(...hazardsToAdd);
    }
    state.hazards = state.hazards.filter(
      (hazard) => !hazardsToRemove.has(hazard.id),
    );
  }

  private spawnParticles(
    position: Vector2D,
    color: string,
    count: number = 8,
    type: "pixel" | "glitch" | "nebula" | "blood" = "pixel",
    spread: number = 5,
  ) {
    if (!this.gameState.particles) this.gameState.particles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * spread;
      const maxLife = 300 + Math.random() * 500;

      this.gameState.particles.push({
        id: uuidv4(),
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color,
        size: type === "glitch" ? 3 + Math.random() * 5 : 2 + Math.random() * 2,
        life: 1.0,
        maxLife,
        timestamp: Date.now(),
        type,
      });
    }
  }

  private triggerScreenShake(intensity: number, duration: number) {
    this.gameState.screenShake = {
      intensity,
      duration,
      startTime: Date.now(),
    };
  }

  private updateParticles(state: GameState, delta: number, now: number) {
    if (!state.particles || state.particles.length === 0) return;

    state.particles = state.particles.filter((p) => {
      const age = now - p.timestamp;
      p.life = Math.max(0, 1.0 - age / p.maxLife);

      if (p.life <= 0) return false;

      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;

      // Friction
      p.velocity.x *= 0.92;
      p.velocity.y *= 0.92;

      return true;
    });

    // Cap particle count for performance
    if (state.particles.length > 200) {
      state.particles = state.particles.slice(-200);
    }
  }

  private updateScreenShake(state: GameState, now: number) {
    if (!state.screenShake) return;

    const elapsed = now - state.screenShake.startTime;
    if (elapsed >= state.screenShake.duration) {
      state.screenShake = undefined;
    }
  }

  private damagePlayer(player: Player, amount: number, now: number) {
    if (player.status !== "alive") return;
    if (amount <= 0) return;
    if (
      player.isInvulnerable &&
      player.invulnerableUntil &&
      now < player.invulnerableUntil
    ) {
      return;
    }

    let finalAmount = amount;

    // Aura implementation: Reduce damage from nearby enemies
    if (player.hasAura) {
      const auraRadius = 150;
      const isEnemyNear = this.gameState.enemies.some(
        (e) =>
          Math.hypot(
            e.position.x - player.position.x,
            e.position.y - player.position.y,
          ) < auraRadius,
      );
      if (isEnemyNear) {
        finalAmount *= 0.7; // 30% reduction
      }
    }

    if (finalAmount <= 0) return;

    const heartDamage = Math.max(1, player.maxHealth / PLAYER_HEART_SLOTS);

    // Legenday: God Mode logic
    if (player.hasGodMode && player.health <= heartDamage + 1) {
      if (!player.godModeCooldown || now - player.godModeCooldown > 60000) {
        player.health = Math.max(1, player.health);
        player.isInvulnerable = true;
        player.invulnerableUntil = now + PLAYER_HIT_INVULNERABILITY_MS;
        player.lastHitTimestamp = now;
        player.godModeCooldown = now;
        this.spawnParticles(player.position, "#FFFFFF", 40, "glitch", 15);
        this.triggerScreenShake(15, 500);
        return;
      }
    }

    // Legenday: Plot Armor (Invincibility) - Survive lethal once per wave
    if (
      player.hasInvincibility &&
      !player.invincibilityUsedInWave &&
      player.health <= heartDamage
    ) {
      player.health = 1;
      player.invincibilityUsedInWave = true;
      player.isInvulnerable = true;
      player.invulnerableUntil = now + PLAYER_HIT_INVULNERABILITY_MS;
      player.lastHitTimestamp = now;
      this.spawnParticles(player.position, "#FFD700", 30, "pixel", 10);
      this.triggerScreenShake(10, 300);
      return;
    }

    if (this.gameState.wave >= 5) {
      this.tookDamageAfterWave5 = true;
    }

    player.health = Math.max(0, player.health - heartDamage);
    player.lastHitTimestamp = now;
    player.isInvulnerable = true;
    player.invulnerableUntil = now + PLAYER_HIT_INVULNERABILITY_MS;

    if (player.health <= 0) {
      player.health = 0;
      player.status = "dead";
      player.attachedBug = undefined;
      player.wasShakePressed = false;
      player.isInvulnerable = false;
      player.invulnerableUntil = 0;
    }
  }

  private updateTrailSegments(state: GameState, delta: number, now: number) {
    if (!state.trailSegments) return;
    state.trailSegments = state.trailSegments.filter((seg) => {
      const age = now - seg.timestamp;
      if (age > 2000) return false; // 2s duration

      // Damage enemies
      state.enemies.forEach((enemy) => {
        if (
          Math.hypot(
            enemy.position.x - seg.position.x,
            enemy.position.y - seg.position.y,
          ) < 30
        ) {
          enemy.health -= 0.5 * (delta / 50); // Small DoT
          enemy.lastHitTimestamp = now;
        }
      });
      return true;
    });
  }

  private updateBinaryDrops(state: GameState, delta: number, now: number) {
    if (!state.binaryDrops) return;
    state.binaryDrops = state.binaryDrops.filter((drop) => {
      const age = now - drop.timestamp;
      if (age > 10000) return false;

      // Collection
      const player = state.players.find(
        (p) =>
          p.status === "alive" &&
          Math.hypot(
            p.position.x - drop.position.x,
            p.position.y - drop.position.y,
          ) < 50,
      );
      if (player) {
        if (drop.type === "1") {
          player.projectileDamage += 0.5; // Small permanent buff
        } else {
          player.health = Math.min(player.maxHealth, player.health + 2); // Small heal
        }
        return false;
      }
      return true;
    });
  }
}
