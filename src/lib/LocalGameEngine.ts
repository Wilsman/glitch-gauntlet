import type {
  GameState,
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
} from "@shared/types";
import { getRandomUpgrades } from "@shared/upgrades";
import { applyUpgradeEffect } from "@shared/upgradeEffects";
import { createEnemy, selectRandomEnemyType } from "@shared/enemyConfig";
import { getCharacter } from "@shared/characterConfig";
import {
  incrementLevel10Count,
  checkUnlocks,
  saveLastRunStats,
  recordGameEnd,
} from "./progressionStorage";
import {
  createBoss,
  getBossForWave,
  BOSS_CONFIGS,
  BERSERKER_CHARGE_TELEGRAPH,
  BERSERKER_CHARGE_SPEED,
  BERSERKER_CHARGE_DURATION,
  BERSERKER_SLAM_TELEGRAPH,
  BERSERKER_SLAM_RINGS,
  BERSERKER_SLAM_RING_SPACING,
  BERSERKER_SLAM_RING_SPEED,
  BERSERKER_SLAM_DAMAGE,
  SUMMONER_PORTAL_TELEGRAPH,
  SUMMONER_PORTAL_SPAWN_INTERVAL,
  SUMMONER_PORTAL_HEALTH,
  SUMMONER_PORTAL_COUNT,
  SUMMONER_TELEPORT_TELEGRAPH,
  SUMMONER_BEAM_TELEGRAPH,
  SUMMONER_BEAM_SPEED,
  SUMMONER_BEAM_DAMAGE,
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
} from "@shared/bossConfig";

const MAX_PLAYERS = 4;
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const PLAYER_COLORS = ["#00FFFF", "#FF00FF", "#FFFF00", "#00FF00"];
const TICK_RATE = 50; // ms
const WAVE_DURATION = 20000; // 20 seconds per wave
const WIN_WAVE = 5;
const REVIVE_DURATION = 3000; // 3 seconds to revive
const EXTRACTION_DURATION = 5000; // 5 seconds to extract
const HELLHOUND_ROUND_INTERVAL = 5; // Every 5 rounds
const HELLHOUND_ROUND_START = 5; // First hellhound round at wave 5

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class LocalGameEngine {
  private gameState: GameState;
  private lastTick: number = 0;
  private tickInterval: number | null = null;
  private upgradeChoices: Map<string, UpgradeOption[]> = new Map();
  private waveTimer: number = 0;
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

  constructor(playerId: string, characterType: CharacterType = "spray-n-pray") {
    const character = getCharacter(characterType);
    this.characterType = characterType;
    this.gameStartTime = Date.now();

    const initialPlayer: Player = {
      id: playerId,
      position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
      health: character.baseHealth,
      maxHealth: character.baseHealth,
      level: 1,
      xp: 0,
      xpToNextLevel: 10,
      color: PLAYER_COLORS[0],
      attackCooldown: 0,
      attackSpeed: character.baseAttackSpeed,
      status: "alive",
      speed: character.baseSpeed,
      projectileDamage: character.baseDamage,
      reviveProgress: 0,
      pickupRadius: 30,
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
      status: "playing",
      players: [initialPlayer],
      enemies: [],
      projectiles: [],
      xpOrbs: [],
      wave: 1,
      teleporter: null,
      pets: [],
      orbitalSkulls: [],
      fireTrails: [],
      turrets: [],
      clones: [],
      waveTimer: 0,
      boss: null,
      shockwaveRings: [],
      bossProjectiles: [],
      bossDefeatedRewardClaimed: false,
    };

    // Pet Pal Percy starts with a pet
    if (character.startsWithPet) {
      const petEmojis = ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁"];
      const randomEmoji =
        petEmojis[Math.floor(Math.random() * petEmojis.length)];
      const startingPet: Pet = {
        id: uuidv4(),
        ownerId: playerId,
        position: { ...initialPlayer.position },
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

  getGameState(): GameState {
    // Return a deep clone to prevent external mutations
    return JSON.parse(JSON.stringify(this.gameState));
  }

  setOnUnlockCallback(callback: (characterType: CharacterType) => void) {
    this.onUnlock = callback;
  }

  updateInput(input: InputState) {
    // Clone the input to avoid reference issues
    this.inputState = { ...input };
    const player = this.gameState.players[0];
    if (player) {
      player.lastInput = { ...input };
    }
  }

  useBlink() {
    const player = this.gameState.players[0];
    if (!player || player.characterType !== "dash-dynamo") return;
    if (!player.blinkReady || player.blinkCooldown! > 0) return;

    // Blink 150 units in the direction of movement or toward mouse
    const input = player.lastInput;
    if (!input) return;

    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

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
        Math.min(ARENA_WIDTH - 15, player.position.x + dx)
      );
      player.position.y = Math.max(
        15,
        Math.min(ARENA_HEIGHT - 15, player.position.y + dy)
      );

      // Set cooldown (5 seconds)
      player.blinkCooldown = 5000;
      player.blinkReady = false;
    }
  }

  placeTurret() {
    const player = this.gameState.players[0];
    if (!player || player.characterType !== "turret-tina") return;
    if (!this.gameState.turrets) this.gameState.turrets = [];

    // Limit to 3 turrets - prevent placement if already at max
    const playerTurrets = this.gameState.turrets.filter(
      (t) => t.ownerId === player.id
    );
    if (playerTurrets.length >= 3) {
      return; // Cannot place more turrets until one expires
    }

    const now = Date.now();
    // Scale turret attack speed with player's attack speed (turrets are 50% slower than player)
    const turretAttackSpeed = Math.max(300, player.attackSpeed * 1.5);

    const newTurret: Turret = {
      id: uuidv4(),
      ownerId: player.id,
      position: { ...player.position },
      health: 50,
      maxHealth: 50,
      damage: 8 + player.level * 2,
      attackSpeed: turretAttackSpeed,
      attackCooldown: 0,
      range: 300,
      expiresAt: now + 20000, // 20 seconds duration
    };
    this.gameState.turrets.push(newTurret);
  }

  selectUpgrade(upgradeId: string) {
    const player = this.gameState.players[0];
    const choices = this.upgradeChoices.get(player.id);
    const choice = choices?.find((c) => c.id === upgradeId);
    if (!player || !choice) return;

    applyUpgradeEffect(player, choice.type);

    // Spawn pet if pet upgrade selected
    if (choice.type === "pet") {
      if (!this.gameState.pets) this.gameState.pets = [];
      const petEmojis = [
        "🐶",
        "🐱",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐸",
      ];
      const randomEmoji =
        petEmojis[Math.floor(Math.random() * petEmojis.length)];
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
        angle: angleOffset * (orbitalCount - 1), // Evenly space skulls
        radius: 60,
        damage: 10 + player.level * 2, // Scales with level
      };
      this.gameState.orbitalSkulls.push(newSkull);
    }

    // Track collected upgrade
    if (!player.collectedUpgrades) player.collectedUpgrades = [];
    const existing = player.collectedUpgrades.find(
      (u) => u.type === choice.type
    );
    if (existing) {
      existing.count++;
    } else {
      player.collectedUpgrades.push({
        type: choice.type,
        title: choice.title,
        rarity: choice.rarity,
        emoji: choice.emoji,
        count: 1,
      });
    }

    this.gameState.levelingUpPlayerId = null;
    this.upgradeChoices.delete(player.id);
  }

  getUpgradeOptions(): UpgradeOption[] | null {
    if (!this.gameState.levelingUpPlayerId) return null;
    return this.upgradeChoices.get(this.gameState.levelingUpPlayerId) || null;
  }

  private tick() {
    const now = Date.now();
    const delta = now - this.lastTick;
    this.lastTick = now;

    const state = this.gameState;

    // Pause game loop if player is leveling up
    if (state.levelingUpPlayerId) return;

    const timeFactor = delta / (1000 / 60);

    // Only update game mechanics if still playing or in boss fight
    if (state.status === "playing" || state.status === "bossFight") {
      this.updatePlayerMovement(state, timeFactor);
      this.updatePlayerEffects(state, delta);
      this.updateVampireDrain(state, delta, now);
      this.updateBlinkCooldown(state, delta);
      this.updateRevives(state, delta);
      this.updatePets(state, now, delta, timeFactor);
      this.updateOrbitalSkulls(state, now, delta);
      this.updateFireTrails(state, now, delta);
      this.updateTurrets(state, now, delta);
      this.updateClones(state, now, delta);

      if (state.status === "bossFight") {
        this.updateBoss(state, now, delta, timeFactor);
        this.updateShockwaveRings(state, delta);
        this.updateBossProjectiles(state, delta);
      } else {
        this.updateEnemyAI(state, now, delta, timeFactor);
        this.updateWaves(state, delta);
      }

      this.updatePlayerAttacks(state, delta);
      this.updateProjectiles(state, now, delta, timeFactor);
      this.updateStatusEffects(state, delta);
      this.updateExplosions(state, now);
      this.updateChainLightning(state, now);
      this.updateXPOrbs(state);
    }

    // Handle extraction in bossDefeated state
    if (state.status === "bossDefeated") {
      this.updatePlayerMovement(state, timeFactor);
      this.updateExtraction(state, delta);
    }

    // Always check game status to save stats when game ends
    this.updateGameStatus(state);
  }

  private updatePlayerMovement(state: GameState, timeFactor: number) {
    state.players.forEach((p) => {
      if (p.status === "alive" && p.lastInput) {
        if (p.lastInput.up) p.position.y -= p.speed * timeFactor;
        if (p.lastInput.down) p.position.y += p.speed * timeFactor;
        if (p.lastInput.left) p.position.x -= p.speed * timeFactor;
        if (p.lastInput.right) p.position.x += p.speed * timeFactor;
        p.position.x = Math.max(15, Math.min(ARENA_WIDTH - 15, p.position.x));
        p.position.y = Math.max(15, Math.min(ARENA_HEIGHT - 15, p.position.y));
      }
    });
  }

  private updatePlayerEffects(state: GameState, delta: number) {
    state.players.forEach((p) => {
      if (p.status !== "alive") return;
      // Regeneration
      if (p.regeneration && p.regeneration > 0) {
        p.health = Math.min(
          p.maxHealth,
          p.health + (p.regeneration * delta) / 1000
        );
      }
      // Shield recharge (slowly)
      if (p.maxShield && p.maxShield > 0) {
        if (!p.shield) p.shield = 0;
        p.shield = Math.min(p.maxShield, p.shield + (10 * delta) / 1000);
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
          enemy.position.y - p.position.y
        );
        if (dist <= drainRadius) {
          const actualDamage = Math.min(drainDamage, enemy.health);
          enemy.health -= actualDamage;
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
            target.position.y - turret.position.y
          );
          return dist <= turret.range;
        });

        if (targetsInRange.length > 0) {
          const target = targetsInRange[0];
          const baseAngle = Math.atan2(
            target.position.y - turret.position.y,
            target.position.x - turret.position.x
          );

          // Inherit player's multishot
          const shots = Math.max(1, owner.projectilesPerShot || 1);
          const spread = (10 * Math.PI) / 180; // Same spread as player

          for (let i = 0; i < shots; i++) {
            const offset = (i - (shots - 1) / 2) * spread;
            const angle = baseAngle + offset;

            // Inherit player's crit chance and calculate crit
            const isCrit = Math.random() < (owner.critChance || 0);
            const baseDamage = turret.damage + (owner.projectileDamage - 8); // Add player's bonus damage
            const finalDamage = Math.round(
              baseDamage * (isCrit ? owner.critMultiplier || 2 : 1)
            );

            const projectile: Projectile = {
              id: uuidv4(),
              ownerId: turret.ownerId,
              position: { ...turret.position },
              velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
              damage: finalDamage,
              isCrit,
              kind: "bullet",
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
      if (player.status !== "alive" || !player.cloneCount || player.cloneCount <= 0) return;

      // Check if player is moving
      const isMoving = player.lastInput && (
        player.lastInput.up || player.lastInput.down ||
        player.lastInput.left || player.lastInput.right
      );

      if (!isMoving) return;

      // Calculate spawn cooldown based on stacks
      const spawnCooldown = Math.max(
        500, // Minimum 0.5s cooldown
        CLONE_SPAWN_COOLDOWN_BASE - (player.cloneCount - 1) * CLONE_COOLDOWN_REDUCTION
      );

      // Check if enough time has passed since last spawn
      if (!player.lastCloneSpawnTime || now - player.lastCloneSpawnTime >= spawnCooldown) {
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
            target.position.y - clone.position.y
          );
          return dist <= clone.range;
        });

        if (targetsInRange.length > 0) {
          const target = targetsInRange[0];
          const angle = Math.atan2(
            target.position.y - clone.position.y,
            target.position.x - clone.position.x
          );

          // Clone fires a single projectile (no multishot)
          const baseDamage = Math.round(owner.projectileDamage * clone.damage);
          
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
            p.position.y - deadPlayer.position.y
          ) < 50
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
    timeFactor: number
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
              enemy.position.y - pet.position.y
            );
            return d < closest.dist ? { enemy, dist: d } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity }
        );

        if (nearestEnemy.enemy && nearestEnemy.dist < 400) {
          pet.attackCooldown = pet.attackSpeed;
          const angle = Math.atan2(
            nearestEnemy.enemy.position.y - pet.position.y,
            nearestEnemy.enemy.position.x - pet.position.x
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

  private updateEnemyAI(
    state: GameState,
    now: number,
    delta: number,
    timeFactor: number
  ) {
    const isHellhoundRound = state.isHellhoundRound || false;
    const waitingForHellhoundRound = state.waitingForHellhoundRound || false;

    if (isHellhoundRound) {
      // Check if all normal enemies are dead
      const normalEnemies = state.enemies.filter((e) => e.type !== "hellhound");
      const allNormalEnemiesDead = normalEnemies.length === 0;

      // Only spawn hellhounds after all normal enemies are dead
      if (allNormalEnemiesDead) {
        const totalHellhounds = state.totalHellhoundsInRound || 0;
        const hellhoundsKilled = state.hellhoundsKilled || 0;
        const currentHellhounds = state.enemies.filter(
          (e) => e.type === "hellhound"
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
            totalHellhounds - hellhoundsSpawned
          );

          const side = Math.floor(Math.random() * 4);

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
              state.wave
            );
            state.enemies.push(newHellhound);
          }

          state.hellhoundSpawnTimer = 3000 + Math.random() * 2000;
        }
      }
    } else if (!waitingForHellhoundRound) {
      // Only spawn normal enemies if NOT waiting for hellhound round
      const enemySpawnRate = 0.05 + state.wave * 0.01;
      if (
        state.enemies.length < 10 * state.players.length &&
        Math.random() < enemySpawnRate
      ) {
        const enemyType = selectRandomEnemyType(state.wave);
        const spawnX = Math.random() * ARENA_WIDTH;
        const spawnY = Math.random() > 0.5 ? -20 : ARENA_HEIGHT + 20;
        const newEnemy = createEnemy(
          uuidv4(),
          { x: spawnX, y: spawnY },
          enemyType,
          state.wave
        );
        state.enemies.push(newEnemy);
      }
    }

    state.enemies.forEach((enemy) => {
      const alivePlayers = state.players.filter((p) => p.status === "alive");
      if (alivePlayers.length === 0) return;
      const closestPlayer = alivePlayers.reduce(
        (closest, player) => {
          const dist = Math.hypot(
            enemy.position.x - player.position.x,
            enemy.position.y - player.position.y
          );
          return dist < closest.dist ? { player, dist } : closest;
        },
        { player: null as Player | null, dist: Infinity }
      );
      if (closestPlayer.player) {
        const p = closestPlayer.player;

        if (enemy.attackSpeed && enemy.attackCooldown !== undefined) {
          enemy.attackCooldown -= delta;
          if (enemy.attackCooldown <= 0 && closestPlayer.dist < 400) {
            enemy.attackCooldown = enemy.attackSpeed;
            const angle = Math.atan2(
              p.position.y - enemy.position.y,
              p.position.x - enemy.position.x
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
          let incomingDamage = enemy.damage * (delta / 1000);
          if (p.dodge && Math.random() < p.dodge) {
            incomingDamage = 0;
          } else {
            if (p.armor && p.armor > 0) {
              incomingDamage *= 1 - p.armor;
            }
            if (p.shield && p.shield > 0) {
              const absorbed = Math.min(p.shield, incomingDamage);
              p.shield -= absorbed;
              incomingDamage -= absorbed;
            }
            if (p.thorns && p.thorns > 0) {
              enemy.health -= incomingDamage * p.thorns;
            }
          }
          p.health = Math.max(0, p.health - incomingDamage);
          p.lastHitTimestamp = now;
          if (p.health <= 0) p.status = "dead";
        } else {
          let effectiveSpeed = enemy.speed;
          
          // Apply status effect slows
          if (enemy.statusEffects && enemy.statusEffects.length > 0) {
            const slowEffect = enemy.statusEffects.find(
              (e) => e.type === "frozen" || e.type === "slowed"
            );
            if (slowEffect && slowEffect.slowAmount) {
              effectiveSpeed *= slowEffect.slowAmount;
            }
          }
          
          // Apply timeWarp slow (30% slow = 70% speed)
          const hasTimeWarpPlayer = state.players.some((p) => p.hasTimeWarp);
          if (hasTimeWarpPlayer) {
            effectiveSpeed *= 0.7;
          }

          const angle = Math.atan2(
            p.position.y - enemy.position.y,
            p.position.x - enemy.position.x
          );
          enemy.position.x += Math.cos(angle) * effectiveSpeed * timeFactor;
          enemy.position.y += Math.sin(angle) * effectiveSpeed * timeFactor;
        }
      }
    });
  }

  private updatePlayerAttacks(state: GameState, delta: number) {
    state.players.forEach((p) => {
      if (p.status !== "alive") return;
      p.attackCooldown -= delta;

      // Determine target: boss if in boss fight, otherwise closest enemy
      let targetPosition: { x: number; y: number } | null = null;

      if (state.status === "bossFight" && state.boss) {
        targetPosition = state.boss.position;
      } else if (state.enemies.length > 0) {
        const closestEnemy = state.enemies.reduce(
          (closest, enemy) => {
            const dist = Math.hypot(
              enemy.position.x - p.position.x,
              enemy.position.y - p.position.y
            );
            return dist < closest.dist ? { enemy, dist } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity }
        );
        if (closestEnemy.enemy) {
          targetPosition = closestEnemy.enemy.position;
        }
      }

      if (p.attackCooldown <= 0 && targetPosition) {
        p.attackCooldown = p.attackSpeed;
        const baseAngle = Math.atan2(
          targetPosition.y - p.position.y,
          targetPosition.x - p.position.x
        );

        // Weapon-specific behavior
        if (p.weaponType === "grenade-launcher") {
          // Boom Bringer: Single grenade with built-in explosion
          const isCrit = Math.random() < (p.critChance || 0);
          const damage = Math.round(
            p.projectileDamage * (isCrit ? p.critMultiplier || 2 : 1)
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
              p.projectileDamage * (isCrit ? p.critMultiplier || 2 : 1)
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
            state.projectiles.push(bullet);
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
            p.projectileDamage * (isCrit ? p.critMultiplier || 2 : 1)
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
              p.projectileDamage * 0.4 * (isCrit ? p.critMultiplier || 2 : 1)
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
            const damage = Math.round(
              p.projectileDamage * (isCrit ? p.critMultiplier || 2 : 1)
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
              p.projectileDamage * (isCrit ? p.critMultiplier || 2 : 1)
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
    timeFactor: number
  ) {
    state.projectiles = state.projectiles.filter((proj) => {
      const owner = state.players.find((pp) => pp.id === proj.ownerId);
      const radius = proj.radius ?? 8;

      if (proj.kind === "bananarang") {
        const origin = proj.spawnPosition || proj.position;
        const distFromOrigin = Math.hypot(
          proj.position.x - origin.x,
          proj.position.y - origin.y
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
      if (proj.kind === "bullet" && proj.maxRange && proj.spawnPosition) {
        const distFromOrigin = Math.hypot(
          proj.position.x - proj.spawnPosition.x,
          proj.position.y - proj.spawnPosition.y
        );
        if (distFromOrigin >= proj.maxRange) {
          return false; // Remove projectile
        }
      }

      if (
        proj.kind === "bullet" &&
        owner &&
        owner.homingStrength &&
        owner.homingStrength > 0
      ) {
        const nearestEnemy = state.enemies.reduce(
          (closest, enemy) => {
            const dist = Math.hypot(
              enemy.position.x - proj.position.x,
              enemy.position.y - proj.position.y
            );
            return dist < closest.dist ? { enemy, dist } : closest;
          },
          { enemy: null as Enemy | null, dist: Infinity }
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

      proj.position.x += proj.velocity.x * timeFactor;
      proj.position.y += proj.velocity.y * timeFactor;

      const isEnemyProjectile = state.enemies.some(
        (e) => e.id === proj.ownerId
      );
      if (isEnemyProjectile) {
        for (const player of state.players) {
          if (player.status !== "alive") continue;
          if (
            Math.hypot(
              proj.position.x - player.position.x,
              proj.position.y - player.position.y
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
            player.health = Math.max(0, player.health - incomingDamage);
            player.lastHitTimestamp = now;
            if (player.health <= 0) player.status = "dead";
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
                proj.position.y - generator.position.y
              );
              if (distToGen < radius + 20) {
                generator.health -= proj.damage;

                if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                  owner.health = Math.min(
                    owner.maxHealth,
                    owner.health + proj.damage * owner.lifeSteal
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
                proj.position.y - portal.position.y
              );
              if (distToPortal < radius + 25) {
                portal.health -= proj.damage;

                if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                  owner.health = Math.min(
                    owner.maxHealth,
                    owner.health + proj.damage * owner.lifeSteal
                  );
                  owner.lastHealedTimestamp = now;
                }

                return false;
              }
            }
          }

          // Check boss collision (skip if invulnerable)
          if (!state.boss.isInvulnerable) {
            const bossConfig = BOSS_CONFIGS[state.boss.type];
            const distToBoss = Math.hypot(
              proj.position.x - state.boss.position.x,
              proj.position.y - state.boss.position.y
            );
            if (distToBoss < radius + bossConfig.size) {
              let finalDamage = proj.damage;
              if (owner && owner.health < owner.maxHealth * 0.3) {
                finalDamage *= 1.5;
              }
              state.boss.health -= finalDamage;
              state.boss.lastHitTimestamp = now;

              if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                owner.health = Math.min(
                  owner.maxHealth,
                  owner.health + proj.damage * owner.lifeSteal
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
              proj.position.y - enemy.position.y
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
              });
            }
            if (owner && owner.knockbackForce && owner.knockbackForce > 0) {
              const angle = Math.atan2(
                enemy.position.y - proj.position.y,
                enemy.position.x - proj.position.x
              );
              enemy.position.x += Math.cos(angle) * owner.knockbackForce;
              enemy.position.y += Math.sin(angle) * owner.knockbackForce;
            }
            if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
              owner.health = Math.min(
                owner.maxHealth,
                owner.health + proj.damage * owner.lifeSteal
              );
              owner.lastHealedTimestamp = now;
            }
            enemy.lastHitTimestamp = now;
            if (proj.isCrit) enemy.lastCritTimestamp = now;
            if (owner) {
              if (!enemy.statusEffects) enemy.statusEffects = [];
              if (owner.fireDamage && owner.fireDamage > 0) {
                enemy.statusEffects.push({
                  type: "burning",
                  damage: owner.fireDamage * proj.damage,
                  duration: 2000,
                });
              }
              if (owner.poisonDamage && owner.poisonDamage > 0) {
                enemy.statusEffects.push({
                  type: "poisoned",
                  damage: owner.poisonDamage * proj.damage,
                  duration: 3000,
                });
              }
              if (owner.iceSlow && owner.iceSlow > 0) {
                enemy.statusEffects.push({
                  type: "slowed",
                  slowAmount: owner.iceSlow,
                  duration: 2000,
                });
              }
            }
            if (!enemy.damageNumbers) enemy.damageNumbers = [];
            enemy.damageNumbers.push({
              id: uuidv4(),
              damage: proj.damage,
              isCrit: proj.isCrit || false,
              position: { ...enemy.position },
              timestamp: now,
            });

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
                      e.position.y - currentTarget.position.y
                    ) < chainRange
                );

                if (nearbyEnemies.length === 0) break;

                const nextTarget = nearbyEnemies.reduce(
                  (closest, e) => {
                    const dist = Math.hypot(
                      e.position.x - currentTarget.position.x,
                      e.position.y - currentTarget.position.y
                    );
                    return dist < closest.dist ? { enemy: e, dist } : closest;
                  },
                  { enemy: null as Enemy | null, dist: Infinity }
                ).enemy;

                if (!nextTarget) break;

                nextTarget.health -= chainDamage;
                nextTarget.lastHitTimestamp = now;
                if (!nextTarget.damageNumbers) nextTarget.damageNumbers = [];
                nextTarget.damageNumbers.push({
                  id: uuidv4(),
                  damage: Math.round(chainDamage),
                  isCrit: false,
                  position: { ...nextTarget.position },
                  timestamp: now,
                });

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
                  (e) => !proj.hitEnemies!.includes(e.id) && e.health > 0
                );

                if (nearbyEnemies.length > 0) {
                  const nextTarget = nearbyEnemies.reduce(
                    (closest, e) => {
                      const dist = Math.hypot(
                        e.position.x - proj.position.x,
                        e.position.y - proj.position.y
                      );
                      return dist < closest.dist ? { enemy: e, dist } : closest;
                    },
                    { enemy: null as Enemy | null, dist: Infinity }
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
          (dmg) => now - dmg.timestamp < 1000
        );
      }
    });

    const deadEnemies = state.enemies.filter((e) => e.health <= 0);
    deadEnemies.forEach((dead) => {
      // Check if any player has lucky upgrade
      const hasLuckyPlayer = state.players.some((p) => p.hasLucky);
      const xpValue = hasLuckyPlayer ? dead.xpValue * 2 : dead.xpValue;
      
      state.xpOrbs.push({
        id: uuidv4(),
        position: dead.position,
        value: xpValue,
        isDoubled: hasLuckyPlayer,
      });

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
            state.wave
          );
          state.enemies.push(miniSplitter);
        }
      }

      const killer = state.players.find((p) =>
        state.projectiles.some((proj) => proj.ownerId === p.id)
      );
      if (killer && killer.explosionDamage && killer.explosionDamage > 0) {
        if (!state.explosions) state.explosions = [];
        state.explosions.push({
          id: uuidv4(),
          position: { ...dead.position },
          radius: 80,
          timestamp: now,
          damage: dead.maxHealth * killer.explosionDamage,
          ownerId: killer.id,
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

  private updateExplosions(state: GameState, now: number) {
    if (!state.explosions) return;
    state.explosions.forEach((explosion) => {
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - explosion.position.x,
          enemy.position.y - explosion.position.y
        );
        if (dist < explosion.radius) {
          enemy.health -= explosion.damage;
          enemy.lastHitTimestamp = now;
        }
      });
    });
    state.explosions = state.explosions.filter(
      (exp) => now - exp.timestamp < 500
    );
  }

  private updateChainLightning(state: GameState, now: number) {
    if (!state.chainLightning) return;
    state.chainLightning = state.chainLightning.filter(
      (chain) => now - chain.timestamp < 200
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
          enemy.position.y - skullY
        );
        if (dist < 20) {
          // Skull hitbox radius
          enemy.health -= skull.damage;
          enemy.lastHitTimestamp = now;

          // Apply burning status effect from skulls
          if (!enemy.statusEffects) enemy.statusEffects = [];
          const burnDamage = skull.damage * 0.5; // 50% of skull damage as burn
          const existing = enemy.statusEffects.find(
            (e) => e.type === "burning"
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
    const FIRE_TRAIL_DAMAGE_INTERVAL = 200; // Damage every 200ms

    state.fireTrails.forEach((trail) => {
      // Check if enough time has passed for next damage tick
      const timeSinceSpawn = now - trail.timestamp;

      // Damage enemies in trail
      state.enemies.forEach((enemy) => {
        const dist = Math.hypot(
          enemy.position.x - trail.position.x,
          enemy.position.y - trail.position.y
        );
        if (dist < trail.radius) {
          // Apply damage periodically
          if (timeSinceSpawn % FIRE_TRAIL_DAMAGE_INTERVAL < 50) {
            // Small window for damage tick
            enemy.health -= trail.damage * (delta / 1000);
            enemy.lastHitTimestamp = now;

            // Apply burning status
            if (!enemy.statusEffects) enemy.statusEffects = [];
            const existing = enemy.statusEffects.find(
              (e) => e.type === "burning"
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
      (trail) => now - trail.timestamp < FIRE_TRAIL_DURATION
    );
  }

  private updateXPOrbs(state: GameState) {
    state.players.forEach((p) => {
      if (p.status !== "alive") return;

      // First, move orbs within pickup radius directly to player
      state.xpOrbs.forEach((orb) => {
        const dx = p.position.x - orb.position.x;
        const dy = p.position.y - orb.position.y;
        const distance = Math.hypot(dx, dy);
        const radius = p.pickupRadius || 30;

        if (distance < radius && distance > 0) {
          // Snap directly to player position - no overshooting
          orb.position.x = p.position.x;
          orb.position.y = p.position.y;
        }
      });

      // Then collect orbs at player position
      state.xpOrbs = state.xpOrbs.filter((orb) => {
        const distance = Math.hypot(
          p.position.x - orb.position.x,
          p.position.y - orb.position.y
        );
        if (distance < 5) {
          p.xp += orb.value;
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
        state.levelingUpPlayerId = p.id;
        const choices = getRandomUpgrades(3).map((o) => ({
          ...o,
          id: uuidv4(),
        }));
        this.upgradeChoices.set(p.id, choices);
      }
    });
  }

  private updateExtraction(state: GameState, delta: number) {
    if (!state.teleporter) return;

    const alivePlayers = state.players.filter((p) => p.status === "alive");

    alivePlayers.forEach((player) => {
      const distToTeleporter = Math.hypot(
        player.position.x - state.teleporter!.position.x,
        player.position.y - state.teleporter!.position.y
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
            (p) => (p.extractionProgress || 0) >= EXTRACTION_DURATION
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
    // If waiting for enemies to clear before starting hellhound round
    if (state.waitingForHellhoundRound && state.enemies.length === 0) {
      // Now increment to the hellhound wave and activate it
      state.wave++;
      state.waitingForHellhoundRound = false;
      state.isHellhoundRound = true;
      state.hellhoundRoundPending = false;
      state.hellhoundsKilled = 0;
      state.hellhoundRoundComplete = false;
      state.hellhoundSpawnTimer = 0;
      state.totalHellhoundsInRound = Math.min(
        24,
        8 + (state.wave - HELLHOUND_ROUND_START) * 2
      );
      this.waveTimer = 0;
      state.waveTimer = 0;
      return;
    }

    if (state.hellhoundRoundComplete) {
      const alivePlayers = state.players.filter((p) => p.status === "alive");
      if (alivePlayers.length > 0 && !state.levelingUpPlayerId) {
        const player = alivePlayers[0];
        state.levelingUpPlayerId = player.id;
        const legendaryUpgrades = getRandomUpgrades(3, "legendary");
        this.upgradeChoices.set(
          player.id,
          legendaryUpgrades.map((o) => ({ ...o, id: uuidv4() }))
        );
      }

      const playersWhoGotUpgrades = alivePlayers.filter((p) =>
        p.collectedUpgrades?.some((u) => u.rarity === "legendary")
      );

      if (
        playersWhoGotUpgrades.length === alivePlayers.length ||
        !state.levelingUpPlayerId
      ) {
        state.isHellhoundRound = false;
        state.hellhoundRoundComplete = false;
        state.hellhoundsKilled = 0;
        state.totalHellhoundsInRound = 0;
        state.hellhoundRoundPending = false;
        state.wave++;
        this.waveTimer = 0;
      }
      return;
    }

    // Don't update timer if waiting for hellhound round
    if (!state.waitingForHellhoundRound) {
      this.waveTimer += delta;
      state.waveTimer = this.waveTimer; // Sync to game state for UI
    }

    if (this.waveTimer >= WAVE_DURATION && !state.waitingForHellhoundRound) {
      // Check if NEXT wave would be a hellhound round
      const nextWave = state.wave + 1;
      const isNextWaveHellhound =
        nextWave >= HELLHOUND_ROUND_START &&
        (nextWave - HELLHOUND_ROUND_START) % HELLHOUND_ROUND_INTERVAL === 0;

      // Check if NEXT wave would be a boss wave
      const bossType = getBossForWave(nextWave);

      if (bossType) {
        // Boss wave - increment immediately and clear enemies
        state.wave++;
        this.waveTimer = 0;
        state.waveTimer = 0;
        state.enemies = [];
        state.boss = createBoss(
          uuidv4(),
          { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
          bossType,
          state.wave
        );
        state.status = "bossFight";
        return;
      } else if (isNextWaveHellhound) {
        // Hellhound round - wait for enemies to clear before incrementing
        state.waitingForHellhoundRound = true;
        // Pause the timer
        this.waveTimer = WAVE_DURATION;
        state.waveTimer = WAVE_DURATION;
      } else {
        // Normal wave - increment immediately
        state.wave++;
        this.waveTimer = 0;
        state.waveTimer = 0;
      }
    }
  }

  private updateGameStatus(state: GameState) {
    const previousStatus = state.status;

    if (state.players.every((p) => p.status === "dead")) {
      state.status = "gameOver";
    }

    // Save stats when game ends
    if (
      (previousStatus === "playing" || previousStatus === "bossDefeated") &&
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
    timeFactor: number
  ) {
    if (!state.boss) return;

    const boss = state.boss;
    const config = BOSS_CONFIGS[boss.type];

    // Check for enrage
    if (
      !boss.isEnraged &&
      boss.health / boss.maxHealth <= config.enrageThreshold
    ) {
      boss.isEnraged = true;
      boss.phase = 2;
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
            state.wave
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
      state.boss = null;
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

  private startBossAttack(state: GameState, boss: Boss, now: number) {
    const config = BOSS_CONFIGS[boss.type];
    const cooldown = boss.isEnraged
      ? config.enragedAttackCooldown
      : config.attackCooldown;

    if (boss.type === "berserker") {
      // Choose attack: Charge (60%/80% enraged) or Slam (40%/20%)
      const chargeChance = boss.isEnraged ? 0.8 : 0.6;
      const attackType = Math.random() < chargeChance ? "charge" : "slam";

      if (attackType === "charge") {
        // Target nearest player
        const target = this.getNearestPlayer(state, boss.position);
        if (!target) return;

        const dx = target.position.x - boss.position.x;
        const dy = target.position.y - boss.position.y;
        const dist = Math.hypot(dx, dy);

        boss.currentAttack = {
          type: "charge",
          telegraphStartTime: now,
          telegraphDuration: BERSERKER_CHARGE_TELEGRAPH,
          executeTime: now + BERSERKER_CHARGE_TELEGRAPH,
          direction: { x: dx / dist, y: dy / dist },
        };
      } else {
        // Slam attack
        boss.currentAttack = {
          type: "slam",
          telegraphStartTime: now,
          telegraphDuration: BERSERKER_SLAM_TELEGRAPH,
          executeTime: now + BERSERKER_SLAM_TELEGRAPH,
          targetPosition: { ...boss.position },
        };
      }
    } else if (boss.type === "summoner") {
      // Choose attack: Summon (40%), Teleport (30%), Beam (30%)
      const rand = Math.random();
      let attackType: "summon" | "teleport" | "beam";

      if (rand < 0.4) {
        attackType = "summon";
      } else if (rand < 0.7) {
        attackType = "teleport";
      } else {
        attackType = "beam";
      }

      if (attackType === "summon") {
        // Spawn portals
        boss.currentAttack = {
          type: "summon",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_PORTAL_TELEGRAPH,
          executeTime: now + SUMMONER_PORTAL_TELEGRAPH,
        };

        // Initialize portals array if needed
        if (!boss.portals) boss.portals = [];

        // Only spawn portals if under the max limit of 3
        const maxPortals = 3;
        const currentPortalCount = boss.portals.length;
        const portalsToSpawn = Math.min(SUMMONER_PORTAL_COUNT, maxPortals - currentPortalCount);

        // Create portals at random positions
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

        boss.currentAttack = {
          type: "beam",
          telegraphStartTime: now,
          telegraphDuration: SUMMONER_BEAM_TELEGRAPH,
          executeTime: now + SUMMONER_BEAM_TELEGRAPH,
          targetPosition: { ...target.position },
        };
      }
    } else if (boss.type === "architect") {
      // Choose attack: Laser Grid (40%), Floor Hazards (40%), Shield Phase (20% when phase 2)
      const rand = Math.random();
      let attackType: "laser-grid" | "floor-hazard";

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

      attackType = rand < 0.5 ? "laser-grid" : "floor-hazard";

      if (attackType === "laser-grid") {
        boss.currentAttack = {
          type: "laser-grid",
          telegraphStartTime: now,
          telegraphDuration: ARCHITECT_LASER_TELEGRAPH,
          executeTime: now + ARCHITECT_LASER_TELEGRAPH,
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
    }

    boss.attackCooldown = cooldown;
  }

  private updateBossAttack(
    state: GameState,
    boss: Boss,
    now: number,
    delta: number,
    timeFactor: number
  ) {
    if (!boss.currentAttack) return;

    const attack = boss.currentAttack;

    if (attack.type === "charge") {
      // During telegraph, boss is stationary
      if (now < attack.executeTime!) {
        return; // Telegraphing
      }

      // Execute charge
      if (!attack.targetPosition) {
        // First frame of charge - set end position
        const chargeDistance =
          BERSERKER_CHARGE_SPEED * (BERSERKER_CHARGE_DURATION / 1000);
        attack.targetPosition = {
          x: boss.position.x + attack.direction!.x * chargeDistance,
          y: boss.position.y + attack.direction!.y * chargeDistance,
        };
      }

      // Move boss
      boss.position.x +=
        attack.direction!.x * BERSERKER_CHARGE_SPEED * timeFactor;
      boss.position.y +=
        attack.direction!.y * BERSERKER_CHARGE_SPEED * timeFactor;

      // Clamp to arena
      boss.position.x = Math.max(
        40,
        Math.min(ARENA_WIDTH - 40, boss.position.x)
      );
      boss.position.y = Math.max(
        40,
        Math.min(ARENA_HEIGHT - 40, boss.position.y)
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
          p.position.y - boss.position.y
        );
        if (dist < 40 + 15) {
          // boss radius + player radius
          const config = BOSS_CONFIGS[boss.type];
          const damage = Math.round(
            config.baseDamage *
              Math.pow(config.damageScaling, Math.floor(state.wave / 10) - 1)
          );
          p.health -= damage;
          p.lastHitTimestamp = now;
          if (p.health <= 0) {
            p.health = 0;
            p.status = "dead";
          }
        }
      });

      // End charge after duration
      if (now >= attack.executeTime! + BERSERKER_CHARGE_DURATION) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "slam") {
      // During telegraph, boss is stationary
      if (now < attack.executeTime!) {
        return; // Telegraphing
      }

      // Execute slam - spawn shockwave rings
      if (!state.shockwaveRings) state.shockwaveRings = [];

      // Spawn rings only once
      if (now < attack.executeTime! + 100) {
        // 100ms grace period
        for (let i = 0; i < BERSERKER_SLAM_RINGS; i++) {
          state.shockwaveRings.push({
            id: uuidv4(),
            position: { ...attack.targetPosition! },
            currentRadius: i * BERSERKER_SLAM_RING_SPACING,
            maxRadius: 300,
            damage: BERSERKER_SLAM_DAMAGE,
            timestamp: now,
            speed: BERSERKER_SLAM_RING_SPEED,
            hitPlayers: new Set(),
          });
        }
      }

      // End slam after rings spawn
      if (now >= attack.executeTime! + 500) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "summon") {
      // Portals are already spawned, just end the attack after telegraph
      if (now >= attack.executeTime!) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "teleport") {
      if (now >= attack.executeTime!) {
        // Execute teleport
        boss.position = { ...attack.targetPosition! };
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "beam") {
      // During telegraph, boss is stationary
      if (now < attack.executeTime!) {
        return; // Telegraphing
      }

      // Execute beam - spawn projectile once
      if (!state.bossProjectiles) state.bossProjectiles = [];
      
      // Spawn beam projectile only once
      if (now < attack.executeTime! + 100) { // 100ms grace period
        const direction = {
          x: attack.targetPosition!.x - boss.position.x,
          y: attack.targetPosition!.y - boss.position.y,
        };
        const length = Math.hypot(direction.x, direction.y);
        const normalized = {
          x: direction.x / length,
          y: direction.y / length,
        };

        state.bossProjectiles.push({
          id: uuidv4(),
          position: { ...boss.position },
          velocity: {
            x: normalized.x * SUMMONER_BEAM_SPEED * 60, // Convert to pixels per second
            y: normalized.y * SUMMONER_BEAM_SPEED * 60,
          },
          damage: SUMMONER_BEAM_DAMAGE,
          radius: 15,
          type: 'beam',
          hitPlayers: new Set(),
        });
      }

      // End beam attack after projectile spawns
      if (now >= attack.executeTime! + 500) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "laser-grid") {
      // Laser grid attack - rotating lasers
      if (now < attack.executeTime!) {
        return; // Telegraphing
      }

      // Check collision with players
      const rotationSpeed =
        ARCHITECT_LASER_ROTATION_SPEED * (boss.isEnraged ? 1.5 : 1);
      const elapsed = (now - attack.executeTime!) / 1000;

      for (let i = 0; i < ARCHITECT_LASER_COUNT; i++) {
        const angle = (i * Math.PI) / 2 + elapsed * rotationSpeed;
        const laserLength = Math.max(ARENA_WIDTH, ARENA_HEIGHT); // Extend to arena edges

        // Check if any player intersects with this laser beam
        state.players.forEach((p) => {
          if (p.status !== "alive") return;

          // Calculate distance from player to laser line
          const dx = p.position.x - boss.position.x;
          const dy = p.position.y - boss.position.y;
          const dist = Math.hypot(dx, dy);

          if (dist > laserLength) return;

          const playerAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(playerAngle - angle);

          // Normalize angle difference
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          // If player is close to laser beam (within ~5 degrees)
          if (angleDiff < 0.1) {
            // Damage player (once per 500ms)
            if (!p.lastHitTimestamp || now - p.lastHitTimestamp > 500) {
              p.health -= ARCHITECT_LASER_DAMAGE;
              p.lastHitTimestamp = now;
              if (p.health <= 0) {
                p.health = 0;
                p.status = "dead";
              }
            }
          }
        });
      }

      // End attack after 5 seconds
      if (now >= attack.executeTime! + 5000) {
        boss.currentAttack = undefined;
      }
    } else if (attack.type === "floor-hazard") {
      // Floor hazards - simplified for now
      if (now >= attack.executeTime! + 1000) {
        boss.currentAttack = undefined;
      }
    }
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
    position: { x: number; y: number }
  ) {
    const alivePlayers = state.players.filter((p) => p.status === "alive");
    if (alivePlayers.length === 0) return null;

    let nearest = alivePlayers[0];
    let minDist = Math.hypot(
      nearest.position.x - position.x,
      nearest.position.y - position.y
    );

    for (let i = 1; i < alivePlayers.length; i++) {
      const dist = Math.hypot(
        alivePlayers[i].position.x - position.x,
        alivePlayers[i].position.y - position.y
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
          p.position.y - ring.position.y
        );
        const ringThickness = 20; // Hit zone thickness

        if (Math.abs(dist - ring.currentRadius) < ringThickness) {
          // Hit player
          p.health -= ring.damage;
          p.lastHitTimestamp = now;
          if (!ring.hitPlayers) ring.hitPlayers = new Set();
          ring.hitPlayers.add(p.id);

          if (p.health <= 0) {
            p.health = 0;
            p.status = "dead";
          }
        }
      });
    });

    // Remove rings that have expanded beyond max radius
    state.shockwaveRings = state.shockwaveRings.filter(
      (ring) => ring.currentRadius < ring.maxRadius
    );
  }

  private updateBossProjectiles(state: GameState, delta: number) {
    if (!state.bossProjectiles) return;

    const now = Date.now();
    const ARENA_WIDTH = 800;
    const ARENA_HEIGHT = 600;
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
          p.position.y - projectile.position.y
        );

        if (dist < projectile.radius + 20) { // Player radius ~20
          // Hit player
          p.health -= projectile.damage;
          p.lastHitTimestamp = now;
          if (!projectile.hitPlayers) projectile.hitPlayers = new Set();
          projectile.hitPlayers.add(p.id);

          // Mark projectile for removal after hitting a player
          projectilesToRemove.add(projectile.id);

          if (p.health <= 0) {
            p.health = 0;
            p.status = "dead";
          }
        }
      });
    });

    // Remove projectiles that hit players or are out of bounds
    state.bossProjectiles = state.bossProjectiles.filter(
      (proj) =>
        !projectilesToRemove.has(proj.id) &&
        proj.position.x >= -50 &&
        proj.position.x <= ARENA_WIDTH + 50 &&
        proj.position.y >= -50 &&
        proj.position.y <= ARENA_HEIGHT + 50
    );
  }

  continueAfterBoss() {
    const state = this.gameState;
    if (state.status !== "bossDefeated") return;

    // Remove teleporter
    state.teleporter = null;

    // Resume normal gameplay
    state.status = "playing";
    state.wave++;
    this.waveTimer = 0;
    state.waveTimer = 0;

    // Grant reward - legendary upgrade choice
    const player = state.players.find((p) => p.status === "alive");
    if (player) {
      state.levelingUpPlayerId = player.id;
      const legendaryUpgrades = getRandomUpgrades(3, "legendary");
      this.upgradeChoices.set(
        player.id,
        legendaryUpgrades.map((o) => ({ ...o, id: uuidv4() }))
      );
    }

    state.bossDefeatedRewardClaimed = true;
  }
}
