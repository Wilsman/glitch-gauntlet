import type { Pet, Player } from "@shared/types";

export interface PetBubble {
  text: string;
  age: number;
  remaining: number;
}

interface ChatterContext {
  bossActive: boolean;
  stage?: number;
  kills?: number;
}

type Trigger =
  | "start"
  | "stage"
  | "levelUp"
  | "ownerHurt"
  | "petHit"
  | "boss"
  | "bossDown"
  | "kills"
  | "idle";

const LINES: Record<Trigger, string[]> = {
  start: ["Walkies!!", "Let's go, Dan!", "Adventure time!"],
  stage: ["New smells!", "Sniff sniff...", "Ooh, where are we?"],
  levelUp: ["Good job, Dan!", "You're so strong!", "Treat for you!"],
  ownerHurt: ["Dan!? You OK?", "Stay behind me!", "*worried whine*"],
  petHit: ["Grr!", "Hey! Rude!", "Bark bark!", "Yip!"],
  boss: ["BIG one. Grr...", "*hackles up*", "I'm not scared!"],
  bossDown: ["Can I chew it?", "We did it!!", "*victory zoomies*"],
  kills: ["So many squeaky toys!", "Fetch! Fetch!", "*happy panting*"],
  idle: ["*wags*", "Treat?", "Belly rubs?", "Zzz...", "*sniffs floor*", "Is that a ball?", "Who's a good boy? Me!"],
};

// Minimum gap since the previous line before this trigger may speak; big moments can cut in sooner.
const GAP_BEFORE: Record<Trigger, number> = {
  start: 0,
  stage: 4000,
  ownerHurt: 4000,
  boss: 4000,
  bossDown: 4000,
  levelUp: 10000,
  kills: 14000,
  petHit: 14000,
  idle: 14000,
};
// Per-trigger cooldown so one kind of line can't dominate.
const TRIGGER_COOLDOWN: Partial<Record<Trigger, number>> = {
  petHit: 40000,
  ownerHurt: 20000,
  levelUp: 30000,
};
const BUBBLE_MS = 2600;
const IDLE_AFTER_MS = 5000;
const IDLE_GAP_MIN_MS = 25000;
const IDLE_GAP_RANGE_MS = 25000;
const KILL_MILESTONE = 50;
const FIRST_LINE_DELAY_MS = 1200;

interface Memory {
  bornAt: number;
  saidStart: boolean;
  bubble: { text: string; at: number } | null;
  lastLine: string;
  triggerAt: Partial<Record<Trigger, number>>;
  ownerLevel: number;
  ownerHurt: boolean;
  petHitAt: number;
  bossActive: boolean;
  stage?: number;
  killMilestone: number;
  ownerX: number;
  ownerY: number;
  ownerStillSince: number;
  nextIdleAt: number;
}

const memories = new Map<string, Memory>();
let lastSpokeAt = -Infinity;

const pick = (lines: string[], avoid: string) => {
  const pool = lines.length > 1 ? lines.filter((line) => line !== avoid) : lines;
  return pool[Math.floor(Math.random() * pool.length)];
};

export function getPetBubble(
  pet: Pet,
  owner: Player | undefined,
  ctx: ChatterContext,
  now: number,
): PetBubble | null {
  if (!owner) return null;
  // Simulation time restarts with each run.
  if (now < lastSpokeAt) lastSpokeAt = -Infinity;

  let memory = memories.get(pet.id);
  if (!memory) {
    if (memories.size > 20) memories.clear();
    memory = {
      bornAt: now,
      saidStart: false,
      bubble: null,
      lastLine: "",
      triggerAt: {},
      ownerLevel: owner.level,
      ownerHurt: false,
      petHitAt: pet.lastHitTimestamp ?? 0,
      bossActive: ctx.bossActive,
      stage: ctx.stage,
      killMilestone: Math.floor((ctx.kills ?? 0) / KILL_MILESTONE),
      ownerX: owner.position.x,
      ownerY: owner.position.y,
      ownerStillSince: now,
      nextIdleAt: now + IDLE_GAP_MIN_MS,
    };
    memories.set(pet.id, memory);
  }

  // Collect this frame's edge-triggered events, most important first.
  const events: { trigger: Trigger; chance: number }[] = [];
  const hurt = owner.status === "alive" && owner.health / owner.maxHealth < 0.3;
  if (hurt && !memory.ownerHurt) events.push({ trigger: "ownerHurt", chance: 1 });
  memory.ownerHurt = hurt;

  if (ctx.bossActive && !memory.bossActive) events.push({ trigger: "boss", chance: 1 });
  if (!ctx.bossActive && memory.bossActive) events.push({ trigger: "bossDown", chance: 1 });
  memory.bossActive = ctx.bossActive;

  if (owner.level > memory.ownerLevel) events.push({ trigger: "levelUp", chance: 0.5 });
  memory.ownerLevel = owner.level;

  if (ctx.stage !== undefined && memory.stage !== undefined && ctx.stage !== memory.stage) {
    events.push({ trigger: "stage", chance: 1 });
  }
  memory.stage = ctx.stage;

  const hitAt = pet.lastHitTimestamp ?? 0;
  if (hitAt > memory.petHitAt) events.push({ trigger: "petHit", chance: 0.35 });
  memory.petHitAt = hitAt;

  const milestone = Math.floor((ctx.kills ?? 0) / KILL_MILESTONE);
  if (milestone > memory.killMilestone) events.push({ trigger: "kills", chance: 0.6 });
  memory.killMilestone = milestone;

  if (!memory.saidStart && now - memory.bornAt > FIRST_LINE_DELAY_MS) {
    memory.saidStart = true;
    events.push({ trigger: "start", chance: 1 });
  }

  const moved = Math.abs(owner.position.x - memory.ownerX) + Math.abs(owner.position.y - memory.ownerY) > 2;
  if (moved) memory.ownerStillSince = now;
  memory.ownerX = owner.position.x;
  memory.ownerY = owner.position.y;
  if (now - memory.ownerStillSince > IDLE_AFTER_MS && now >= memory.nextIdleAt) {
    events.push({ trigger: "idle", chance: 1 });
  }

  const event = events.find(
    (e) =>
      now - lastSpokeAt >= GAP_BEFORE[e.trigger] &&
      now - (memory.triggerAt[e.trigger] ?? -Infinity) >= (TRIGGER_COOLDOWN[e.trigger] ?? 0) &&
      Math.random() < e.chance,
  );
  if (event) {
    const text = pick(LINES[event.trigger], memory.lastLine);
    memory.bubble = { text, at: now };
    memory.lastLine = text;
    memory.triggerAt[event.trigger] = now;
    memory.nextIdleAt = now + IDLE_GAP_MIN_MS + Math.random() * IDLE_GAP_RANGE_MS;
    lastSpokeAt = now;
  }

  if (!memory.bubble) return null;
  const age = now - memory.bubble.at;
  if (age < 0 || age >= BUBBLE_MS) {
    memory.bubble = null;
    return null;
  }
  return { text: memory.bubble.text, age, remaining: BUBBLE_MS - age };
}
