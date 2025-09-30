import { DurableObject } from "cloudflare:workers";
import type { GameState, Player, InputState, UpgradeOption, Enemy, Projectile, XpOrb, Teleporter, DamageNumber, CollectedUpgrade, StatusEffect, Explosion, ChainLightning, Pet } from '@shared/types';
import { getRandomUpgrades } from './upgrades';
import { applyUpgradeEffect } from './upgradeEffects';
import { createEnemy, selectRandomEnemyType } from './enemyConfig';
const MAX_PLAYERS = 4;
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const PLAYER_COLORS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
const TICK_RATE = 50; // ms
const WAVE_DURATION = 30000; // 30 seconds per wave
const WIN_WAVE = 5;
const REVIVE_DURATION = 3000; // 3 seconds to revive
const HELLHOUND_ROUND_INTERVAL = 5; // Every 5 rounds
const HELLHOUND_ROUND_START = 5; // First hellhound round at wave 5
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
        
        // Spawn pet if pet upgrade selected
        if (choice.type === 'pet' && gameState) {
            if (!gameState.pets) gameState.pets = [];
            const petEmojis = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'];
            const randomEmoji = petEmojis[Math.floor(Math.random() * petEmojis.length)];
            const newPet: Pet = {
                id: uuidv4(),
                ownerId: playerId,
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
            gameState.pets.push(newPet);
        }
        
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
            this.updatePets(state, now, delta, timeFactor);
            this.updateEnemyAI(state, now, delta, timeFactor);
            this.updatePlayerAttacks(state, delta);
            this.updateProjectiles(state, now, delta, timeFactor);
            this.updateStatusEffects(state, delta);
            this.updateExplosions(state, now);
            this.updateChainLightning(state, now);
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
    updatePets(state: GameState, now: number, delta: number, timeFactor: number) {
        if (!state.pets) return;
        
        state.pets = state.pets.filter(pet => {
            const owner = state.players.find(p => p.id === pet.ownerId);
            // Remove pet if owner is dead or disconnected
            if (!owner || owner.status === 'dead') return false;
            
            // Pet follows owner at a distance
            const followDistance = 40;
            const dx = owner.position.x - pet.position.x;
            const dy = owner.position.y - pet.position.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > followDistance) {
                const speed = 3 * timeFactor;
                pet.position.x += (dx / dist) * speed;
                pet.position.y += (dy / dist) * speed;
            }
            
            // Pet attacks nearest enemy
            pet.attackCooldown -= delta;
            if (pet.attackCooldown <= 0 && state.enemies.length > 0) {
                const nearestEnemy = state.enemies.reduce((closest, enemy) => {
                    const d = Math.hypot(enemy.position.x - pet.position.x, enemy.position.y - pet.position.y);
                    return d < closest.dist ? { enemy, dist: d } : closest;
                }, { enemy: null as Enemy | null, dist: Infinity });
                
                if (nearestEnemy.enemy && nearestEnemy.dist < 400) {
                    pet.attackCooldown = pet.attackSpeed;
                    const angle = Math.atan2(nearestEnemy.enemy.position.y - pet.position.y, nearestEnemy.enemy.position.x - pet.position.x);
                    const petProjectile: Projectile = {
                        id: uuidv4(),
                        ownerId: pet.id, // Pet owns this projectile
                        position: { ...pet.position },
                        velocity: { x: Math.cos(angle) * 8, y: Math.sin(angle) * 8 },
                        damage: pet.damage,
                        isCrit: false,
                        kind: 'bullet',
                        radius: 4,
                        hitEnemies: [],
                        pierceRemaining: 0,
                        ricochetRemaining: 0,
                    };
                    state.projectiles.push(petProjectile);
                }
            }
            
            // Pet levels up with owner
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
    updateEnemyAI(state: GameState, now: number, delta: number, timeFactor: number) {
        // Check if this is a hellhound round
        const isHellhoundRound = state.isHellhoundRound || false;
        
        if (isHellhoundRound) {
            // Hellhound round spawning logic with pack mechanics
            const totalHellhounds = state.totalHellhoundsInRound || 0;
            const hellhoundsKilled = state.hellhoundsKilled || 0;
            const currentHellhounds = state.enemies.filter(e => e.type === 'hellhound').length;
            const hellhoundsSpawned = (currentHellhounds + hellhoundsKilled);
            
            // Initialize spawn timer if not set
            if (state.hellhoundSpawnTimer === undefined) {
                state.hellhoundSpawnTimer = 0;
            }
            
            // Update spawn timer
            state.hellhoundSpawnTimer -= delta;
            
            // Spawn packs of hellhounds with 3-5 second delays between packs
            if (state.hellhoundSpawnTimer <= 0 && hellhoundsSpawned < totalHellhounds) {
                // Spawn a pack of 3-5 hellhounds
                const packSize = Math.min(
                    Math.floor(Math.random() * 3) + 3, // 3-5 dogs
                    totalHellhounds - hellhoundsSpawned // Don't exceed total
                );
                
                // Pick a random side for the entire pack
                const side = Math.floor(Math.random() * 4);
                
                for (let i = 0; i < packSize; i++) {
                    let spawnX, spawnY;
                    
                    // Spawn pack from same side but spread out
                    if (side === 0) { // top
                        spawnX = Math.random() * ARENA_WIDTH;
                        spawnY = -20 - (Math.random() * 30); // Spread vertically
                    } else if (side === 1) { // bottom
                        spawnX = Math.random() * ARENA_WIDTH;
                        spawnY = ARENA_HEIGHT + 20 + (Math.random() * 30);
                    } else if (side === 2) { // left
                        spawnX = -20 - (Math.random() * 30);
                        spawnY = Math.random() * ARENA_HEIGHT;
                    } else { // right
                        spawnX = ARENA_WIDTH + 20 + (Math.random() * 30);
                        spawnY = Math.random() * ARENA_HEIGHT;
                    }
                    
                    const newHellhound = createEnemy(uuidv4(), { x: spawnX, y: spawnY }, 'hellhound', state.wave);
                    state.enemies.push(newHellhound);
                }
                
                console.log(`🐺 Spawned pack of ${packSize} hellhounds (${hellhoundsSpawned + packSize}/${totalHellhounds}) at wave ${state.wave}`);
                
                // Set delay for next pack (3-5 seconds)
                state.hellhoundSpawnTimer = 3000 + Math.random() * 2000; // 3000-5000ms
            }
        } else {
            // Normal round spawning
            const enemySpawnRate = 0.05 + (state.wave * 0.01);
            if (state.enemies.length < 10 * state.players.length && Math.random() < enemySpawnRate) {
                const enemyType = selectRandomEnemyType();
                const spawnX = Math.random() * ARENA_WIDTH;
                const spawnY = Math.random() > 0.5 ? -20 : ARENA_HEIGHT + 20;
                const newEnemy = createEnemy(uuidv4(), { x: spawnX, y: spawnY }, enemyType, state.wave);
                console.log(`Spawned ${enemyType} at wave ${state.wave}:`, newEnemy);
                state.enemies.push(newEnemy);
            }
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
                
                // Handle shooting enemies
                if (enemy.attackSpeed && enemy.attackCooldown !== undefined) {
                    enemy.attackCooldown -= delta;
                    if (enemy.attackCooldown <= 0 && closestPlayer.dist < 400) {
                        enemy.attackCooldown = enemy.attackSpeed;
                        const angle = Math.atan2(p.position.y - enemy.position.y, p.position.x - enemy.position.x);
                        const enemyProjectile: Projectile = {
                            id: uuidv4(),
                            ownerId: enemy.id,
                            position: { ...enemy.position },
                            velocity: { 
                                x: Math.cos(angle) * (enemy.projectileSpeed || 4), 
                                y: Math.sin(angle) * (enemy.projectileSpeed || 4) 
                            },
                            damage: enemy.damage,
                            isCrit: false,
                            kind: 'bullet',
                            radius: 6,
                            hitEnemies: [],
                            pierceRemaining: 0,
                            ricochetRemaining: 0,
                        };
                        state.projectiles.push(enemyProjectile);
                        console.log(`${enemy.type} (${enemy.id.substring(0, 8)}) shot projectile at player from distance ${Math.round(closestPlayer.dist)}`);
                    }
                }
                
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
                    // Apply slow effects if present
                    let effectiveSpeed = enemy.speed;
                    if (enemy.statusEffects && enemy.statusEffects.length > 0) {
                        const slowEffect = enemy.statusEffects.find(e => e.type === 'frozen' || e.type === 'slowed');
                        if (slowEffect && slowEffect.slowAmount) {
                            effectiveSpeed *= slowEffect.slowAmount;
                        }
                    }
                    
                    const angle = Math.atan2(p.position.y - enemy.position.y, p.position.x - enemy.position.x);
                    enemy.position.x += Math.cos(angle) * effectiveSpeed * timeFactor;
                    enemy.position.y += Math.sin(angle) * effectiveSpeed * timeFactor;
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
                            ricochetRemaining: p.ricochetCount || 0,
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

            // Homing behavior for bullets
            if (proj.kind === 'bullet' && owner && owner.homingStrength && owner.homingStrength > 0) {
                const nearestEnemy = state.enemies.reduce((closest, enemy) => {
                    const dist = Math.hypot(enemy.position.x - proj.position.x, enemy.position.y - proj.position.y);
                    return dist < closest.dist ? { enemy, dist } : closest;
                }, { enemy: null as Enemy | null, dist: Infinity });
                
                if (nearestEnemy.enemy && nearestEnemy.dist < 300) {
                    const dx = nearestEnemy.enemy.position.x - proj.position.x;
                    const dy = nearestEnemy.enemy.position.y - proj.position.y;
                    const dist = Math.hypot(dx, dy) || 1;
                    const currentSpeed = Math.hypot(proj.velocity.x, proj.velocity.y);
                    const homingForce = owner.homingStrength * 0.5;
                    proj.velocity.x += (dx / dist) * homingForce;
                    proj.velocity.y += (dy / dist) * homingForce;
                    // Normalize to maintain speed
                    const newSpeed = Math.hypot(proj.velocity.x, proj.velocity.y);
                    proj.velocity.x = (proj.velocity.x / newSpeed) * currentSpeed;
                    proj.velocity.y = (proj.velocity.y / newSpeed) * currentSpeed;
                }
            }

            // Integrate position
            proj.position.x += proj.velocity.x * timeFactor;
            proj.position.y += proj.velocity.y * timeFactor;

            // Check if this is an enemy projectile hitting a player
            const isEnemyProjectile = state.enemies.some(e => e.id === proj.ownerId);
            if (isEnemyProjectile) {
                for (const player of state.players) {
                    if (player.status !== 'alive') continue;
                    if (Math.hypot(proj.position.x - player.position.x, proj.position.y - player.position.y) < (radius + 15)) {
                        // Calculate incoming damage
                        let incomingDamage = proj.damage;
                        // Dodge check
                        if (player.dodge && Math.random() < player.dodge) {
                            incomingDamage = 0; // Dodged!
                        } else {
                            // Armor reduction
                            if (player.armor && player.armor > 0) {
                                incomingDamage *= (1 - player.armor);
                            }
                            // Shield absorption
                            if (player.shield && player.shield > 0) {
                                const absorbed = Math.min(player.shield, incomingDamage);
                                player.shield -= absorbed;
                                incomingDamage -= absorbed;
                            }
                        }
                        player.health = Math.max(0, player.health - incomingDamage);
                        player.lastHitTimestamp = now;
                        if (player.health <= 0) player.status = 'dead';
                        return false; // Remove projectile after hitting player
                    }
                }
            }

            // Collisions: persistent hitbox; do NOT remove on hit for bananarang
            // Skip enemy collision if this is an enemy projectile
            if (!isEnemyProjectile) {
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
                    
                    // Chain lightning effect
                    if (owner && owner.chainCount && owner.chainCount > 0) {
                        const chainRange = 150;
                        const chainDamage = finalDamage * 0.7; // 70% damage per chain
                        let currentTarget = enemy;
                        const hitByChain = new Set([enemy.id]);
                        
                        for (let i = 0; i < owner.chainCount; i++) {
                            const nearbyEnemies = state.enemies.filter(e => 
                                !hitByChain.has(e.id) && 
                                Math.hypot(e.position.x - currentTarget.position.x, e.position.y - currentTarget.position.y) < chainRange
                            );
                            
                            if (nearbyEnemies.length === 0) break;
                            
                            const nextTarget = nearbyEnemies.reduce((closest, e) => {
                                const dist = Math.hypot(e.position.x - currentTarget.position.x, e.position.y - currentTarget.position.y);
                                return dist < closest.dist ? { enemy: e, dist } : closest;
                            }, { enemy: null as Enemy | null, dist: Infinity }).enemy;
                            
                            if (!nextTarget) break;
                            
                            // Deal chain damage
                            nextTarget.health -= chainDamage;
                            nextTarget.lastHitTimestamp = now;
                            if (!nextTarget.damageNumbers) nextTarget.damageNumbers = [];
                            nextTarget.damageNumbers.push({ 
                                id: uuidv4(), 
                                damage: Math.round(chainDamage), 
                                isCrit: false, 
                                position: { ...nextTarget.position }, 
                                timestamp: now 
                            });
                            
                            // Create visual lightning bolt
                            if (!state.chainLightning) state.chainLightning = [];
                            state.chainLightning.push({
                                id: uuidv4(),
                                from: { ...currentTarget.position },
                                to: { ...nextTarget.position },
                                timestamp: now
                            });
                            
                            hitByChain.add(nextTarget.id);
                            currentTarget = nextTarget;
                        }
                    }
                    
                    if (proj.kind !== 'bananarang') {
                        // Track hit enemy for pierce
                        if (!proj.hitEnemies) proj.hitEnemies = [];
                        proj.hitEnemies.push(enemy.id);
                        
                        // Ricochet: seek next nearest enemy
                        if (proj.ricochetRemaining && proj.ricochetRemaining > 0) {
                            const nearbyEnemies = state.enemies.filter(e => 
                                !proj.hitEnemies!.includes(e.id) && 
                                e.health > 0
                            );
                            
                            if (nearbyEnemies.length > 0) {
                                const nextTarget = nearbyEnemies.reduce((closest, e) => {
                                    const dist = Math.hypot(e.position.x - proj.position.x, e.position.y - proj.position.y);
                                    return dist < closest.dist ? { enemy: e, dist } : closest;
                                }, { enemy: null as Enemy | null, dist: Infinity }).enemy;
                                
                                if (nextTarget) {
                                    // Redirect bullet toward next target
                                    const dx = nextTarget.position.x - proj.position.x;
                                    const dy = nextTarget.position.y - proj.position.y;
                                    const dist = Math.hypot(dx, dy) || 1;
                                    const speed = Math.hypot(proj.velocity.x, proj.velocity.y);
                                    proj.velocity.x = (dx / dist) * speed;
                                    proj.velocity.y = (dy / dist) * speed;
                                    proj.ricochetRemaining--;
                                    // Don't remove bullet, let it continue
                                } else {
                                    return false; // No more targets
                                }
                            } else {
                                return false; // No more targets
                            }
                        } else if (!proj.pierceRemaining || proj.pierceRemaining <= 0) {
                            // Check if bullet should disappear (no pierce or ricochet left)
                            return false; // bullet disappears
                        } else {
                            proj.pierceRemaining--;
                        }
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
            
            // Track hellhound kills
            if (dead.type === 'hellhound' && state.isHellhoundRound) {
                state.hellhoundsKilled = (state.hellhoundsKilled || 0) + 1;
                console.log(`🐺 Hellhound killed: ${state.hellhoundsKilled}/${state.totalHellhoundsInRound}`);
            }
            
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
        
        // Check if hellhound round is complete
        if (state.isHellhoundRound && state.hellhoundsKilled === state.totalHellhoundsInRound && state.enemies.length === 0) {
            state.hellhoundRoundComplete = true;
            console.log('🎉 Hellhound round complete! All players get legendary upgrades!');
        }
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
    updateChainLightning(state: GameState, now: number) {
        if (!state.chainLightning) return;
        // Clean up old chain lightning visuals (after 200ms)
        state.chainLightning = state.chainLightning.filter(chain => (now - chain.timestamp) < 200);
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
        // Handle hellhound round completion
        if (state.hellhoundRoundComplete) {
            // Give all players legendary upgrades
            const alivePlayers = state.players.filter(p => p.status === 'alive');
            if (alivePlayers.length > 0 && !state.levelingUpPlayerId) {
                // Give legendary upgrade to first alive player (they'll cycle through)
                const player = alivePlayers[0];
                state.levelingUpPlayerId = player.id;
                const legendaryUpgrades = getRandomUpgrades(3, 'legendary');
                this.upgradeChoices.set(player.id, legendaryUpgrades.map(o => ({ ...o, id: uuidv4() })));
                console.log(`🎁 ${player.id} gets legendary upgrade from hellhound round!`);
            }
            
            // Check if all players got their upgrades
            const playersWhoGotUpgrades = alivePlayers.filter(p => 
                p.collectedUpgrades?.some(u => u.rarity === 'legendary')
            );
            
            if (playersWhoGotUpgrades.length === alivePlayers.length || !state.levelingUpPlayerId) {
                // Move to next wave
                state.isHellhoundRound = false;
                state.hellhoundRoundComplete = false;
                state.hellhoundsKilled = 0;
                state.totalHellhoundsInRound = 0;
                state.wave++;
                this.waveTimers.set(state.gameId, 0);
                console.log(`✅ Moving to wave ${state.wave} after hellhound round`);
            }
            return;
        }
        
        let waveTimer = this.waveTimers.get(state.gameId) || 0;
        waveTimer += delta;
        if (waveTimer >= WAVE_DURATION) {
            state.wave++;
            waveTimer = 0;
            
            // Check if next wave should be a hellhound round
            if (state.wave >= HELLHOUND_ROUND_START && (state.wave - HELLHOUND_ROUND_START) % HELLHOUND_ROUND_INTERVAL === 0) {
                state.isHellhoundRound = true;
                state.hellhoundsKilled = 0;
                state.hellhoundRoundComplete = false;
                state.hellhoundSpawnTimer = 0; // Spawn first pack immediately
                // Calculate total hellhounds for this round (scales with wave)
                state.totalHellhoundsInRound = Math.min(24, 8 + (state.wave - HELLHOUND_ROUND_START) * 2);
                console.log(`🐺🐺🐺 HELLHOUND ROUND ${state.wave}! Total hellhounds: ${state.totalHellhoundsInRound}`);
            }
            
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



























