import type { CharacterType, PetCoat } from "@shared/types";
import {
  CANVAS_SIZE,
  composeFrame,
  rasterize,
  type CharacterArt,
  type FrameContext,
  type RenderVariant,
} from "./engine";
import { CHARACTER_ART, DACHSHUND_ART, DACHSHUND_COATS } from "./characters";
import type { CreatureArt, CreatureContext } from "./draw";
import { drawCreature, ENEMY_ART } from "./enemies";
import { BOSS_ART } from "./bosses";
import { hashId } from "./draw";

export { CANVAS_SIZE, ART_PAD, ART_SIZE } from "./engine";
export { CHARACTER_ART, DACHSHUND_ART, DACHSHUND_COATS, PET_COATS } from "./characters";
export { ENEMY_ART } from "./enemies";
export { BOSS_ART } from "./bosses";
export type { CreatureArt, CreatureContext } from "./draw";

/** World units per art pixel for in-game rendering. */
export const PIXEL_SCALE = 2.5;
/** Size of a sprite frame in world units. */
export const SPRITE_WORLD_SIZE = CANVAS_SIZE * PIXEL_SCALE;

const IDLE_FRAME_MS = 220;
const RUN_FRAME_MS = 95;
const GUN_ATTACK_FRAME_MS = 60;
const ATTACK_WINDOW_MS = 150;
const MELEE_SWING_MS = 170;
const ABILITY_FRAME_MS = 120;
const IDLE_BOB = [0, 0, 1, 1];
const RUN_BOB = [0, 1, 0, 1];

export interface SpriteFrameRequest {
  frame: number;
  moving: boolean;
  attackFrame: number;
  abilityActive: boolean;
  damageLevel: number;
  variant?: RenderVariant;
  rim?: boolean;
}

const frameCache = new Map<string, HTMLCanvasElement>();

export function getArtFrame(
  art: CharacterArt,
  request: SpriteFrameRequest,
): HTMLCanvasElement {
  const variant = request.variant ?? "normal";
  const key = [
    art.id,
    request.frame,
    request.moving ? 1 : 0,
    request.attackFrame,
    request.abilityActive ? 1 : 0,
    request.damageLevel,
    variant,
    request.rim ? 1 : 0,
  ].join("|");
  const cached = frameCache.get(key);
  if (cached) return cached;

  const ctx: FrameContext = {
    frame: request.frame,
    moving: request.moving,
    attackFrame: request.attackFrame,
    abilityActive: request.abilityActive,
    bob: (request.moving ? RUN_BOB : IDLE_BOB)[request.frame % 4],
    damageLevel: request.damageLevel,
  };
  const canvas = rasterize(art, composeFrame(art, ctx), {
    variant,
    rim: request.rim,
  });
  frameCache.set(key, canvas);
  return canvas;
}

export function getCharacterArt(type: CharacterType | undefined): CharacterArt {
  return CHARACTER_ART[type ?? "spray-n-pray"] ?? CHARACTER_ART["spray-n-pray"];
}

/** Idle-loop frame for portraits (HUD, character select). */
export function getPortraitFrame(
  type: CharacterType,
  now: number,
): HTMLCanvasElement {
  return getArtFrame(getCharacterArt(type), {
    frame: Math.floor(now / IDLE_FRAME_MS) % 4,
    moving: false,
    attackFrame: -1,
    abilityActive: false,
    damageLevel: 0,
  });
}

// ---------------------------------------------------------------------------
// Player animation state
// ---------------------------------------------------------------------------

interface PlayerAnimMemory {
  facing: 1 | -1;
  deathStartedAt?: number;
}

const playerMemory = new Map<string, PlayerAnimMemory>();

export interface PlayerAnimation {
  canvas: HTMLCanvasElement;
  facing: 1 | -1;
  moving: boolean;
  /** 0..1 progress of the death collapse (1 = fully down). */
  deathProgress: number;
  art: CharacterArt;
}

interface AnimatablePlayer {
  id: string;
  characterType?: CharacterType;
  status: string;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  history?: { x: number; y: number }[];
  lastInput?: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    analogX?: number;
    analogY?: number;
  };
  lastAttackAt?: number;
  aimAngle?: number;
  meleeSwingUntil?: number;
  meleeSwingAngle?: number;
  isAbilityActive?: boolean;
  lastHitTimestamp?: number;
}

function movementVector(player: AnimatablePlayer): { x: number; y: number } {
  const input = player.lastInput;
  if (input) {
    let x = input.analogX ?? 0;
    let y = input.analogY ?? 0;
    if (input.left) x -= 1;
    if (input.right) x += 1;
    if (input.up) y -= 1;
    if (input.down) y += 1;
    if (Math.abs(x) > 0.15 || Math.abs(y) > 0.15) return { x, y };
  }
  const history = player.history;
  if (history && history.length > 0) {
    const last = history[history.length - 1];
    const dx = player.position.x - last.x;
    const dy = player.position.y - last.y;
    if (Math.abs(dx) + Math.abs(dy) > 0.6) return { x: dx, y: dy };
    if (history.length > 1) {
      const prev = history[history.length - 2];
      const hx = last.x - prev.x;
      const hy = last.y - prev.y;
      if (Math.abs(hx) + Math.abs(hy) > 0.6) return { x: hx, y: hy };
    }
  }
  return { x: 0, y: 0 };
}

export function resolvePlayerAnimation(
  player: AnimatablePlayer,
  now: number,
  options: { hitFlash?: boolean; variant?: RenderVariant } = {},
): PlayerAnimation {
  const art = getCharacterArt(player.characterType);
  let memory = playerMemory.get(player.id);
  if (!memory) {
    memory = { facing: 1 };
    playerMemory.set(player.id, memory);
  }

  const isDead = player.status === "dead";
  const move = movementVector(player);
  const moving = !isDead && (move.x !== 0 || move.y !== 0);

  // Attack timing: melee is driven by the swing window, guns by lastAttackAt.
  let attackFrame = -1;
  let aimX: number | null = null;
  const attackFrames = art.attackFrames ?? 2;
  if (player.meleeSwingUntil && now < player.meleeSwingUntil) {
    const elapsed = MELEE_SWING_MS - (player.meleeSwingUntil - now);
    attackFrame = Math.min(
      attackFrames - 1,
      Math.max(0, Math.floor((elapsed / MELEE_SWING_MS) * attackFrames)),
    );
    if (player.meleeSwingAngle !== undefined) aimX = Math.cos(player.meleeSwingAngle);
  } else if (player.lastAttackAt && now - player.lastAttackAt < ATTACK_WINDOW_MS) {
    const elapsed = now - player.lastAttackAt;
    const frame = Math.floor(elapsed / GUN_ATTACK_FRAME_MS);
    attackFrame = frame < attackFrames ? frame : -1;
    if (player.aimAngle !== undefined) aimX = Math.cos(player.aimAngle);
  }

  // Facing: aim while shooting, otherwise movement; otherwise keep last.
  if (!isDead) {
    const recentAim =
      player.lastAttackAt && now - player.lastAttackAt < 450 && player.aimAngle !== undefined
        ? Math.cos(player.aimAngle)
        : null;
    const faceX = aimX ?? recentAim ?? (Math.abs(move.x) > 0.1 ? move.x : 0);
    if (faceX > 0.05) memory.facing = 1;
    else if (faceX < -0.05) memory.facing = -1;
  }

  let deathProgress = 0;
  if (isDead) {
    if (memory.deathStartedAt === undefined) memory.deathStartedAt = now;
    deathProgress = Math.min(1, (now - memory.deathStartedAt) / 420);
  } else {
    memory.deathStartedAt = undefined;
  }

  const abilityActive = !isDead && !!player.isAbilityActive;
  const frameMs = moving ? RUN_FRAME_MS : abilityActive ? ABILITY_FRAME_MS : IDLE_FRAME_MS;
  const frame = isDead ? 0 : Math.floor(now / frameMs) % 4;
  const healthFraction = player.maxHealth > 0 ? player.health / player.maxHealth : 1;
  const damageLevel = healthFraction > 0.66 ? 0 : healthFraction > 0.33 ? 1 : 2;

  const variant: RenderVariant = isDead
    ? "dead"
    : options.hitFlash
      ? "white"
      : (options.variant ?? "normal");

  const canvas = getArtFrame(art, {
    frame,
    moving,
    attackFrame: isDead ? -1 : attackFrame,
    abilityActive,
    damageLevel,
    variant,
    rim: variant === "normal",
  });

  return { canvas, facing: memory.facing, moving, deathProgress, art };
}

// ---------------------------------------------------------------------------
// Pets
// ---------------------------------------------------------------------------

const petMemory = new Map<string, { x: number; y: number; facing: 1 | -1; movingUntil: number }>();
const dachshundArtByCoat = new Map<PetCoat, CharacterArt>();

function getDachshundArt(coat: PetCoat = "red"): CharacterArt {
  let art = dachshundArtByCoat.get(coat);
  if (!art) {
    const palette = (DACHSHUND_COATS[coat] ?? DACHSHUND_COATS.red).palette;
    art = { ...DACHSHUND_ART, id: `dachshund-${coat}`, palette: { ...DACHSHUND_ART.palette, ...palette } };
    dachshundArtByCoat.set(coat, art);
  }
  return art;
}

/** Idle trot-in-place frame for menus. */
export function getPetPreviewFrame(coat: PetCoat, now: number): HTMLCanvasElement {
  return getArtFrame(getDachshundArt(coat), {
    frame: Math.floor(now / 110) % 4,
    moving: true,
    attackFrame: -1,
    abilityActive: false,
    damageLevel: 0,
  });
}

export function resolvePetFrame(
  pet: { id: string; position: { x: number; y: number }; coat?: PetCoat },
  now: number,
  hitFlash: boolean,
): { canvas: HTMLCanvasElement; facing: 1 | -1 } {
  let memory = petMemory.get(pet.id);
  if (!memory) {
    memory = { x: pet.position.x, y: pet.position.y, facing: 1, movingUntil: 0 };
    petMemory.set(pet.id, memory);
  }
  const dx = pet.position.x - memory.x;
  const dy = pet.position.y - memory.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.4) memory.movingUntil = now + 120;
  if (dx > 0.3) memory.facing = 1;
  else if (dx < -0.3) memory.facing = -1;
  memory.x = pet.position.x;
  memory.y = pet.position.y;

  const moving = now < memory.movingUntil;
  const frame = Math.floor(now / (moving ? 90 : 260)) % 4;
  const canvas = getArtFrame(getDachshundArt(pet.coat), {
    frame,
    moving,
    attackFrame: -1,
    abilityActive: false,
    damageLevel: 0,
    variant: hitFlash ? "white" : "normal",
    rim: !hitFlash,
  });
  return { canvas, facing: memory.facing };
}

// ---------------------------------------------------------------------------
// Creatures (enemies & bosses)
// ---------------------------------------------------------------------------

export function getCreatureFrame(
  art: CreatureArt,
  ctx: CreatureContext,
  variant: RenderVariant = "normal",
  rim = true,
): HTMLCanvasElement {
  const key = [
    art.id,
    ctx.frame,
    ctx.moving ? 1 : 0,
    ctx.state,
    ctx.charge,
    ctx.enraged ? 1 : 0,
    variant,
    rim ? 1 : 0,
  ].join("|");
  const cached = frameCache.get(key);
  if (cached) return cached;
  const style = ctx.enraged && art.enragedPalette
    ? { ...art, palette: { ...art.palette, ...art.enragedPalette } }
    : art;
  const canvas = rasterize(style, drawCreature(art, ctx), { variant, rim });
  frameCache.set(key, canvas);
  return canvas;
}

/** World units per art pixel for enemies (matches players) and bosses. */
export const ENEMY_PIXEL_SCALE = 2.5;
export const BOSS_PIXEL_SCALE = 3;

const creatureMemory = new Map<
  string,
  { x: number; y: number; facing: 1 | -1; movingUntil: number; seenAt: number }
>();

function trackCreatureMotion(
  id: string,
  position: { x: number; y: number },
  now: number,
): { moving: boolean; facing: 1 | -1 } {
  let memory = creatureMemory.get(id);
  if (!memory) {
    memory = { x: position.x, y: position.y, facing: 1, movingUntil: 0, seenAt: now };
    creatureMemory.set(id, memory);
  }
  const dx = position.x - memory.x;
  const dy = position.y - memory.y;
  if (Math.abs(dx) + Math.abs(dy) > 0.25) memory.movingUntil = now + 140;
  if (dx > 0.2) memory.facing = 1;
  else if (dx < -0.2) memory.facing = -1;
  memory.x = position.x;
  memory.y = position.y;
  memory.seenAt = now;
  // Occasionally drop entries for creatures that are gone.
  if (creatureMemory.size > 600) {
    for (const [key, value] of creatureMemory) {
      if (now - value.seenAt > 5000) creatureMemory.delete(key);
    }
  }
  return { moving: now < memory.movingUntil, facing: memory.facing };
}

const bucket = (progress: number) =>
  Math.max(0, Math.min(3, Math.floor(progress * 4)));

interface AnimatableEnemy {
  id: string;
  type: string;
  position: { x: number; y: number };
  attackCooldown?: number;
  attackSpeed?: number;
  pulseTelegraphUntil?: number;
  chargeTelegraphUntil?: number;
  chargeUntil?: number;
  supportLinkUntil?: number;
  explodeTelegraphUntil?: number;
  eliteAffix?: string;
  isPackAlpha?: boolean;
}

export interface CreatureFrame {
  canvas: HTMLCanvasElement;
  facing: 1 | -1;
  state: CreatureContext["state"];
  charge: number;
}

export function resolveEnemyFrame(
  enemy: AnimatableEnemy,
  now: number,
  variant: RenderVariant = "normal",
): CreatureFrame | null {
  const art = (ENEMY_ART as Record<string, CreatureArt | undefined>)[enemy.type];
  if (!art) return null;
  const motion = trackCreatureMotion(enemy.id, enemy.position, now);

  let state: CreatureContext["state"] = "idle";
  let charge = 0;
  const telegraph = (until: number | undefined, duration: number) => {
    if (until && until > now) {
      state = "telegraph";
      charge = bucket(1 - (until - now) / duration);
      return true;
    }
    return false;
  };

  switch (enemy.type) {
    case "slugger": {
      const cd = enemy.attackCooldown ?? Infinity;
      const speed = enemy.attackSpeed ?? 2500;
      if (speed - cd < 200 && cd > 0) {
        state = "attack";
      } else if (cd < 500) {
        state = "telegraph";
        charge = bucket(1 - Math.max(0, cd) / 500);
      }
      break;
    }
    case "neon-pulse":
      telegraph(enemy.pulseTelegraphUntil, 900);
      break;
    case "tank-bot":
      if (enemy.chargeUntil && enemy.chargeUntil > now) state = "attack";
      else telegraph(enemy.chargeTelegraphUntil, 700);
      break;
    case "leech-beacon":
      telegraph(enemy.supportLinkUntil, 1200);
      break;
    case "bomber":
      telegraph(enemy.explodeTelegraphUntil, 750);
      break;
  }

  const frameMs = art.frameMs ?? 140;
  const phase = hashId(enemy.id) % 997;
  const moving = motion.moving || state === "attack";
  const ctx: CreatureContext = {
    frame: Math.floor((now + phase) / (moving ? frameMs : frameMs * 1.5)) % 4,
    moving,
    state,
    charge,
    enraged: !!enemy.eliteAffix || !!enemy.isPackAlpha,
  };
  return {
    canvas: getCreatureFrame(art, ctx, variant),
    facing: art.directional ? motion.facing : 1,
    state,
    charge,
  };
}

interface AnimatableBoss {
  id: string;
  type: string;
  phase?: number;
  isEnraged?: boolean;
  currentAttack?: {
    telegraphStartTime: number;
    telegraphDuration: number;
    executeTime?: number;
  };
}

export function resolveBossFrame(
  boss: AnimatableBoss,
  now: number,
  variant: RenderVariant = "normal",
): CreatureFrame | null {
  const art = (BOSS_ART as Record<string, CreatureArt | undefined>)[boss.type];
  if (!art) return null;
  let state: CreatureContext["state"] = "idle";
  let charge = 0;
  const attack = boss.currentAttack;
  if (attack) {
    const executeAt =
      attack.executeTime ?? attack.telegraphStartTime + attack.telegraphDuration;
    if (now < executeAt) {
      state = "telegraph";
      const duration = Math.max(1, executeAt - attack.telegraphStartTime);
      charge = bucket((now - attack.telegraphStartTime) / duration);
    } else if (now - executeAt < 450) {
      state = "attack";
    }
  }
  const frameMs = art.frameMs ?? 150;
  const ctx: CreatureContext = {
    frame: Math.floor(now / (state === "idle" ? frameMs : frameMs * 0.6)) % 4,
    moving: false,
    state,
    charge,
    enraged: !!boss.isEnraged || boss.phase === 2,
  };
  return { canvas: getCreatureFrame(art, ctx, variant), facing: 1, state, charge };
}
