import { DurableObject } from "cloudflare:workers";
import type { GameState, Player, InputState, UpgradeOption, Enemy, Projectile, XpOrb, Teleporter, DamageNumber, CollectedUpgrade, StatusEffect, Explosion } from '@shared/types';
import { getRandomUpgrades } from './upgrades';
import { applyUpgradeEffect } from './upgradeEffects';
const MAX_PLAYERS = 4;
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const PLAYER_COLORS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
const TICK_RATE = 50; // ms
const WAVE_DURATION = 30000; // 30 seconds per wave
const WIN_WAVE = 5;
const REVIVE_DURATION = 3000; // 3 seconds to revive
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// Upgrades now loaded from upgrades.ts
export class GlobalDurableObject extends DurableObject {
    private lastTick: number = 0;
    private tickInterval: number | null = null;
    private gameStates: Map<string, GameState> = new Map();
    private upgradeChoices: Map<string, UpgradeOption[]> = new Map();
    private waveTimers: Map<string, number> = new Map();
    constructor(ctx: DurableObjectState, env: unknown) {
        super(ctx, env as any);
        this.ctx.blockConcurrencyWhile(async () => {
            const storedGames = await this.ctx.storage.list<GameState>({ prefix: 'game_state_' });
            for (const [key, value] of storedGames) {
                const gameId = key.replace('game_state_', '');
                this.gameStates.set(gameId, value);
                if (value.status === 'playing') {
                    this.waveTimers.set(gameId, 0);
                }
            }
            if (this.gameStates.size > 0) this.ensureTicking();
        });
    }
    async createGameSession(): Promise<{ gameId: string, playerId: string }> {
        const gameId = uuidv4().substring(0, 6);
        const playerId = uuidv4();
        const initialPlayer: Player = {
            id: playerId,
            position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 },
            health: 100, maxHealth: 100, level: 1, xp: 0, xpToNextLevel: 10,
            color: PLAYER_COLORS[0], attackCooldown: 0, attackSpeed: 500,
            status: 'alive', speed: 4, projectileDamage: 10, reviveProgress: 0,
            pickupRadius: 30, projectilesPerShot: 1, critChance: 0, critMultiplier: 2, lifeSteal: 0,
            hasBananarang: false, bananarangsPerShot: 0,
            collectedUpgrades: [],
        };
        const initialGameState: GameState = {
            gameId,
            status: 'playing',
            players: [initialPlayer],
            enemies: [],
            projectiles: [],
            xpOrbs: [],
            wave: 1,
            teleporter: null,
        };
        this.gameStates.set(gameId, initialGameState);
        this.waveTimers.set(gameId, 0);
        await this.ctx.storage.put(`game_state_${gameId}`, initialGameState);
        this.ensureTicking();
        return { gameId, playerId };
    }
    async joinGameSession(gameId: string): Promise<{ playerId: string } | null> {
        const gameState = this.gameStates.get(gameId);
        if (!gameState || gameState.players.length >= MAX_PLAYERS) return null;
        const playerId = uuidv4();
        const newPlayer: Player = {
            id: playerId,
            position: { x: Math.random() * (ARENA_WIDTH - 80) + 40, y: Math.random() * (ARENA_HEIGHT - 80) + 40 },
            health: 100, maxHealth: 100, level: 1, xp: 0, xpToNextLevel: 10,
            color: PLAYER_COLORS[gameState.players.length % PLAYER_COLORS.length],
            attackCooldown: 0, attackSpeed: 500,
            status: 'alive', speed: 4, projectileDamage: 10, reviveProgress: 0,
            pickupRadius: 30, projectilesPerShot: 1, critChance: 0, critMultiplier: 2, lifeSteal: 0,
            hasBananarang: false, bananarangsPerShot: 0,
            collectedUpgrades: [],
        };
        gameState.players.push(newPlayer);
        return { playerId };
    }
    async getGameState(gameId: string): Promise<GameState | null> {
        return this.gameStates.get(gameId) || null;
    }
    async updateGameState(gameId: string, playerId: string, input: InputState): Promise<GameState | null> {
        const gameState = this.gameStates.get(gameId);
        if (!gameState) return null;
        const player = gameState.players.find(p => p.id === playerId);
        if (player) player.lastInput = input;
        return gameState;
    }
    async selectUpgrade(gameId: string, playerId: string, upgradeId: string) {
        const gameState = this.gameStates.get(gameId);
        const player = gameState?.players.find(p => p.id === playerId);
        const choices = this.upgradeChoices.get(playerId);
        const choice = choices?.find(c => c.id === upgradeId);
        if (!player || !choice) return;
        applyUpgradeEffect(player, choice.type);
        // Track collected upgrade
        if (!player.collectedUpgrades) player.collectedUpgrades = [];
        const existing = player.collectedUpgrades.find(u => u.type === choice.type);
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
        if (gameState) gameState.levelingUpPlayerId = null;
        this.upgradeChoices.delete(playerId);
    }
    async getUpgradeOptions(gameId: string): Promise<UpgradeOption[] | null> {
        const gameState = this.gameStates.get(gameId);
        if (!gameState || !gameState.levelingUpPlayerId) return null;
        return this.upgradeChoices.get(gameState.levelingUpPlayerId) || null;
    }
    ensureTicking() {
        if (this.tickInterval) return;
        this.lastTick = Date.now();
        this.tickInterval = setInterval(() => this.tick(), TICK_RATE);
    }
    async tick() {
        const now = Date.now();
        const delta = (now - this.lastTick);
        this.lastTick = now;
        if (this.gameStates.size === 0) {
            if (this.tickInterval) clearInterval(this.tickInterval);
            this.tickInterval = null;
            return;
        }
        const timeFactor = delta / (1000 / 60);
        for (const [gameId, state] of this.gameStates.entries()) {
            if (state.status !== 'playing' || state.levelingUpPlayerId) continue;
            this.updatePlayerMovement(state, timeFactor);
            this.updatePlayerEffects(state, delta);
            this.updateRevives(state, delta);
            this.updateEnemyAI(state, now, delta, timeFactor);
            this.updatePlayerAttacks(state, delta);
            this.updateProjectiles(state, now, delta, timeFactor);
            this.updateStatusEffects(state, delta);
            this.updateExplosions(state, now);
            this.updateXPOrbs(state);
            this.updateWaves(state, delta);
            this.updateGameStatus(state);
            await this.ctx.storage.put(`game_state_${gameId}`, state);
        }
    }
    updatePlayerMovement(state: GameState, timeFactor: number) {
        state.players.forEach(p => {
            if (p.status === 'alive' && p.lastInput) {
                if (p.lastInput.up) p.position.y -= p.speed * timeFactor;
                if (p.lastInput.down) p.position.y += p.speed * timeFactor;
                if (p.lastInput.left) p.position.x -= p.speed * timeFactor;
                if (p.lastInput.right) p.position.x += p.speed * timeFactor;
                p.position.x = Math.max(15, Math.min(ARENA_WIDTH - 15, p.position.x));
                p.position.y = Math.max(15, Math.min(ARENA_HEIGHT - 15, p.position.y));
            }
        });
    }
    updatePlayerEffects(state: GameState, delta: number) {
        state.players.forEach(p => {
            if (p.status !== 'alive') return;
            // Regeneration
            if (p.regeneration && p.regeneration > 0) {
                p.health = Math.min(p.maxHealth, p.health + (p.regeneration * delta / 1000));
            }
            // Shield recharge (slowly)
            if (p.maxShield && p.maxShield > 0) {
                if (!p.shield) p.shield = 0;
                p.shield = Math.min(p.maxShield, p.shield + (10 * delta / 1000));
            }
        });
    }
    updateRevives(state: GameState, delta: number) {
        const alivePlayers = state.players.filter(p => p.status === 'alive');
        const deadPlayers = state.players.filter(p => p.status === 'dead');
        deadPlayers.forEach(deadPlayer => {
            const reviver = alivePlayers.find(p => Math.hypot(p.position.x - deadPlayer.position.x, p.position.y - deadPlayer.position.y) < 50);
            if (reviver) {
                deadPlayer.reviveProgress += delta;
                if (deadPlayer.reviveProgress >= REVIVE_DURATION) {
                    deadPlayer.status = 'alive';
                    deadPlayer.health = deadPlayer.maxHealth / 2;
                    deadPlayer.reviveProgress = 0;
                }
            } else {
                deadPlayer.reviveProgress = 0;
            }
        });
    }
    updateEnemyAI(state: GameState, now: number, delta: number, timeFactor: number) {
        const enemySpawnRate = 0.05 + (state.wave * 0.01);
        if (state.enemies.length < 10 * state.players.length && Math.random() < enemySpawnRate) {
            const health = 20 + (state.wave * 5);
            const newEnemy: Enemy = { id: uuidv4(), position: { x: Math.random() * ARENA_WIDTH, y: Math.random() > 0.5 ? -20 : ARENA_HEIGHT + 20 }, health, maxHealth: health, type: 'grunt', xpValue: 5, damage: 5 };
            state.enemies.push(newEnemy);
        }
        state.enemies.forEach(enemy => {
            const alivePlayers = state.players.filter(p => p.status === 'alive');
            if (alivePlayers.length === 0) return;
            const closestPlayer = alivePlayers.reduce((closest, player) => {
                const dist = Math.hypot(enemy.position.x - player.position.x, enemy.position.y - player.position.y);
                return dist < closest.dist ? { player, dist } : closest;
            }, { player: null as Player | null, dist: Infinity });
            if (closestPlayer.player) {
                const p = closestPlayer.player;
                if (closestPlayer.dist < 20) {
                    // Calculate incoming damage
                    let incomingDamage = enemy.damage * (delta / 1000);
                    // Dodge check
                    if (p.dodge && Math.random() < p.dodge) {
                        incomingDamage = 0; // Dodged!
                    } else {
                        // Armor reduction
                        if (p.armor && p.armor > 0) {
                            incomingDamage *= (1 - p.armor);
                        }
                        // Shield absorption
                        if (p.shield && p.shield > 0) {
                            const absorbed = Math.min(p.shield, incomingDamage);
                            p.shield -= absorbed;
                            incomingDamage -= absorbed;
                        }
                        // Thorns reflection
                        if (p.thorns && p.thorns > 0) {
                            enemy.health -= incomingDamage * p.thorns;
                        }
                    }
                    p.health = Math.max(0, p.health - incomingDamage);
                    p.lastHitTimestamp = now;
                    if (p.health <= 0) p.status = 'dead';
                } else {
                    const angle = Math.atan2(p.position.y - enemy.position.y, p.position.x - enemy.position.x);
                    enemy.position.x += Math.cos(angle) * 2 * timeFactor;
                    enemy.position.y += Math.sin(angle) * 2 * timeFactor;
                }
            }
        });
    }
    updatePlayerAttacks(state: GameState, delta: number) {
        state.players.forEach(p => {
            if (p.status !== 'alive') return;
            p.attackCooldown -= delta;
            if (p.attackCooldown <= 0 && state.enemies.length > 0) {
                p.attackCooldown = p.attackSpeed;
                const closestEnemy = state.enemies.reduce((closest, enemy) => {
                    const dist = Math.hypot(enemy.position.x - p.position.x, enemy.position.y - p.position.y);
                    return dist < closest.dist ? { enemy, dist } : closest;
                }, { enemy: null as Enemy | null, dist: Infinity });
                if (closestEnemy.enemy) {
                    const baseAngle = Math.atan2(closestEnemy.enemy.position.y - p.position.y, closestEnemy.enemy.position.x - p.position.x);
                    // Fire normal bullets (always)
                    const shots = Math.max(1, p.projectilesPerShot || 1);
                    const spread = 10 * Math.PI / 180; // 10 degrees between bullets
                    for (let i = 0; i < shots; i++) {
                        const offset = (i - (shots - 1) / 2) * spread;
                        const angle = baseAngle + offset;
                        const isCrit = Math.random() < (p.critChance || 0);
                        const damage = Math.round((p.projectileDamage) * (isCrit ? (p.critMultiplier || 2) : 1));
                        const newBullet: Projectile = {
                            hitEnemies: [],
                            pierceRemaining: p.pierceCount || 0,
                            id: uuidv4(),
                            ownerId: p.id,
                            position: { ...p.position },
                            velocity: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                            damage,
                            isCrit,
                            kind: 'bullet',
                            radius: 5,
                        };
                        state.projectiles.push(newBullet);
                    }

                    // Fire bananarangs if unlocked
                    const bananaShots = p.hasBananarang ? Math.max(0, p.bananarangsPerShot || 0) : 0;
                    if (bananaShots > 0) {
                        const bananaSpread = 10 * Math.PI / 180; // degrees between bananas
                        for (let i = 0; i < bananaShots; i++) {
                            const offset = (i - (bananaShots - 1) / 2) * bananaSpread;
                            const angle = baseAngle + offset;
                            const isCrit = Math.random() < (p.critChance || 0);
                            const damage = Math.round((p.projectileDamage) * (isCrit ? (p.critMultiplier || 2) : 1));
                            const speed = 10; // base speed
                            const maxRange = 220; // return distance
                            const radius = 10; // hitbox
                            const bananarang: Projectile = {
                                id: uuidv4(),
                                ownerId: p.id,
                                position: { ...p.position },
                                velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                                damage,
                                isCrit,
                                kind: 'bananarang',
                                spawnPosition: { ...p.position },
                                maxRange,
                                state: 'outbound',
                                returnSpeedMultiplier: 1.2,
                                radius,
                            };
                            state.projectiles.push(bananarang);
                        }
                    }
                }
            }
        });
    }
    updateProjectiles(state: GameState, now: number, delta: number, timeFactor: number) {
        state.projectiles = state.projectiles.filter(proj => {
            const owner = state.players.find(pp => pp.id === proj.ownerId);
            const radius = proj.radius ?? 8;
            // Movement
            if (proj.kind === 'bananarang') {
                // Check range to toggle return
                const origin = proj.spawnPosition || proj.position;
                const distFromOrigin = Math.hypot(proj.position.x - origin.x, proj.position.y - origin.y);
                if (proj.state === 'outbound' && proj.maxRange && distFromOrigin >= proj.maxRange) {
                    proj.state = 'returning';
                }

                // If returning, steer towards owner
                if (proj.state === 'returning' && owner) {
                    const dx = owner.position.x - proj.position.x;
                    const dy = owner.position.y - proj.position.y;
                    const d = Math.hypot(dx, dy) || 1;
                    const baseSpeed = Math.hypot(proj.velocity.x, proj.velocity.y) || 10;
                    const speed = baseSpeed * (proj.returnSpeedMultiplier || 1.2);
                    proj.velocity.x = (dx / d) * speed;
                    proj.velocity.y = (dy / d) * speed;
                    // If we reached the owner, remove projectile
                    if (d < 16) {
                        return false;
                    }
                } else {
                    // Optional slight curve on outbound for a boomerang feel
                    const turn = 0.03 * timeFactor; // radians per frame
                    const cosT = Math.cos(turn);
                    const sinT = Math.sin(turn);
                    const vx = proj.velocity.x;
                    const vy = proj.velocity.y;
                    proj.velocity.x = vx * cosT - vy * sinT;
                    proj.velocity.y = vx * sinT + vy * cosT;
                }
            }

            // Integrate position
            proj.position.x += proj.velocity.x * timeFactor;
            proj.position.y += proj.velocity.y * timeFactor;

            // Collisions: persistent hitbox; do NOT remove on hit for bananarang
            for (const enemy of state.enemies) {
                // Skip if already hit (for pierce)
                if (proj.hitEnemies && proj.hitEnemies.includes(enemy.id)) continue;
                if (Math.hypot(proj.position.x - enemy.position.x, proj.position.y - enemy.position.y) < (radius + 10)) {
                    // Calculate final damage with berserker bonus
                    let finalDamage = proj.damage;
                    if (owner && owner.armor) {
                        // Armor is already applied to player, not enemy
                    }
                    // Berserker: extra damage when owner is low HP
                    if (owner && owner.health < owner.maxHealth * 0.3) {
                        finalDamage *= 1.5;
                    }
                    // Executioner: instant kill if enemy below 15% HP
                    if (owner && enemy.health < enemy.maxHealth * 0.15) {
                        finalDamage = enemy.health;
                    }
                    enemy.health -= finalDamage;
                    // Knockback
                    if (owner && owner.knockbackForce && owner.knockbackForce > 0) {
                        const angle = Math.atan2(enemy.position.y - proj.position.y, enemy.position.x - proj.position.x);
                        enemy.position.x += Math.cos(angle) * owner.knockbackForce;
                        enemy.position.y += Math.sin(angle) * owner.knockbackForce;
                    }
                    if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                        owner.health = Math.min(owner.maxHealth, owner.health + proj.damage * owner.lifeSteal);
                        owner.lastHealedTimestamp = now;
                    }
                    enemy.lastHitTimestamp = now;
                    if (proj.isCrit) enemy.lastCritTimestamp = now;
                    // Apply status effects
                    if (owner) {
                        if (!enemy.statusEffects) enemy.statusEffects = [];
                        if (owner.fireDamage && owner.fireDamage > 0) {
                            enemy.statusEffects.push({ type: 'burning', damage: owner.fireDamage * proj.damage, duration: 2000 });
                        }
                        if (owner.poisonDamage && owner.poisonDamage > 0) {
                            enemy.statusEffects.push({ type: 'poisoned', damage: owner.poisonDamage * proj.damage, duration: 3000 });
                        }
                        if (owner.iceSlow && owner.iceSlow > 0) {
                            enemy.statusEffects.push({ type: 'slowed', slowAmount: owner.iceSlow, duration: 2000 });
                        }
                    }
                    // Add damage number
                    if (!enemy.damageNumbers) enemy.damageNumbers = [];
                    enemy.damageNumbers.push({ id: uuidv4(), damage: proj.damage, isCrit: proj.isCrit || false, position: { ...enemy.position }, timestamp: now });
                    if (proj.kind !== 'bananarang') {
                        // Track hit enemy for pierce
                        if (!proj.hitEnemies) proj.hitEnemies = [];
                        proj.hitEnemies.push(enemy.id);
                        // Check if bullet should disappear
                        if (!proj.pierceRemaining || proj.pierceRemaining <= 0) {
                            return false; // bullet disappears
                        } else {
                            proj.pierceRemaining--;
                        }
                    }
                }
            }
            // Keep inside loose bounds; bananarang may briefly go off-screen
            const inBounds = proj.position.x > -40 && proj.position.x < ARENA_WIDTH + 40 && proj.position.y > -40 && proj.position.y < ARENA_HEIGHT + 40;
            return inBounds;
        });
        // Clean up old damage numbers
        state.enemies.forEach(enemy => {
            if (enemy.damageNumbers) {
                enemy.damageNumbers = enemy.damageNumbers.filter(dmg => (now - dmg.timestamp) < 1000);
            }
        });
        const deadEnemies = state.enemies.filter(e => e.health <= 0);
        deadEnemies.forEach(dead => {
            state.xpOrbs.push({ id: uuidv4(), position: dead.position, value: dead.xpValue });
            // Create explosion if owner has explosion upgrade
            const killer = state.players.find(p => state.projectiles.some(proj => proj.ownerId === p.id));
            if (killer && killer.explosionDamage && killer.explosionDamage > 0) {
                if (!state.explosions) state.explosions = [];
                state.explosions.push({
                    id: uuidv4(),
                    position: { ...dead.position },
                    radius: 80,
                    timestamp: now,
                    damage: dead.maxHealth * killer.explosionDamage,
                    ownerId: killer.id
                });
            }
        });
        state.enemies = state.enemies.filter(e => e.health > 0);
    }
    updateStatusEffects(state: GameState, delta: number) {
        state.enemies.forEach(enemy => {
            if (!enemy.statusEffects || enemy.statusEffects.length === 0) return;
            enemy.statusEffects = enemy.statusEffects.filter(effect => {
                effect.duration -= delta;
                if (effect.duration <= 0) return false;
                // Apply DoT damage
                if (effect.damage && effect.damage > 0) {
                    const dotDamage = (effect.damage / (effect.type === 'burning' ? 2000 : 3000)) * delta;
                    enemy.health -= dotDamage;
                }
                return true;
            });
        });
    }
    updateExplosions(state: GameState, now: number) {
        if (!state.explosions) return;
        state.explosions.forEach(explosion => {
            state.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.position.x - explosion.position.x, enemy.position.y - explosion.position.y);
                if (dist < explosion.radius) {
                    enemy.health -= explosion.damage;
                    enemy.lastHitTimestamp = now;
                }
            });
        });
        // Clean up old explosions (after 500ms)
        state.explosions = state.explosions.filter(exp => (now - exp.timestamp) < 500);
    }
    updateXPOrbs(state: GameState) {
        state.players.forEach(p => {
            if (p.status !== 'alive') return;
            state.xpOrbs = state.xpOrbs.filter(orb => {
                const radius = p.pickupRadius || 30;
                if (Math.hypot(p.position.x - orb.position.x, p.position.y - orb.position.y) < radius) {
                    p.xp += orb.value;
                    return false;
                }
                return true;
            });
            if (p.xp >= p.xpToNextLevel) {
                p.level++;
                p.xp -= p.xpToNextLevel;
                p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5);
                state.levelingUpPlayerId = p.id;
                const choices = getRandomUpgrades(3).map(o => ({ ...o, id: uuidv4() }));
                this.upgradeChoices.set(p.id, choices);
            }
        });
    }
    updateWaves(state: GameState, delta: number) {
        let waveTimer = this.waveTimers.get(state.gameId) || 0;
        waveTimer += delta;
        if (waveTimer >= WAVE_DURATION) {
            state.wave++;
            waveTimer = 0;
            if (state.wave > WIN_WAVE && !state.teleporter) {
                state.teleporter = { id: 'teleporter', position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, radius: 50 };
            }
        }
        this.waveTimers.set(state.gameId, waveTimer);
    }
    updateGameStatus(state: GameState) {
        if (state.players.every(p => p.status === 'dead')) {
            state.status = 'gameOver';
            this.waveTimers.delete(state.gameId);
        }
        if (state.teleporter) {
            const alivePlayers = state.players.filter(p => p.status === 'alive');
            const allInTeleporter = alivePlayers.length > 0 && alivePlayers.every(p => Math.hypot(p.position.x - state.teleporter!.position.x, p.position.y - state.teleporter!.position.y) < state.teleporter!.radius);
            if (allInTeleporter) {
                state.status = 'won';
                this.waveTimers.delete(state.gameId);
            }
        }
    }
}



























