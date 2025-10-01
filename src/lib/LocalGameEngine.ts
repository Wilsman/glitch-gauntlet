import type { GameState, Player, InputState, UpgradeOption, Enemy, Projectile, XpOrb, Teleporter, DamageNumber, StatusEffect, Explosion, ChainLightning, Pet, CharacterType, OrbitalSkull, FireTrail } from '@shared/types';
import { getRandomUpgrades } from '@shared/upgrades';
import { applyUpgradeEffect } from '@shared/upgradeEffects';
import { createEnemy, selectRandomEnemyType } from '@shared/enemyConfig';
import { getCharacter } from '@shared/characterConfig';
import { incrementLevel10Count, checkUnlocks, saveLastRunStats } from './progressionStorage';

const MAX_PLAYERS = 4;
const ARENA_WIDTH = 1280;
const ARENA_HEIGHT = 720;
const PLAYER_COLORS = ['#00FFFF', '#FF00FF', '#FFFF00', '#00FF00'];
const TICK_RATE = 50; // ms
const WAVE_DURATION = 30000; // 30 seconds per wave
const WIN_WAVE = 5;
const REVIVE_DURATION = 3000; // 3 seconds to revive
const EXTRACTION_DURATION = 5000; // 5 seconds to extract
const HELLHOUND_ROUND_INTERVAL = 5; // Every 5 rounds
const HELLHOUND_ROUND_START = 5; // First hellhound round at wave 5

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export class LocalGameEngine {
    private gameState: GameState;
    private lastTick: number = 0;
    private tickInterval: number | null = null;
    private upgradeChoices: Map<string, UpgradeOption[]> = new Map();
    private waveTimer: number = 0;
    private inputState: InputState = { up: false, down: false, left: false, right: false };
    private level10Tracked: Set<string> = new Set(); // Track which players already counted for level 10
    private onUnlock?: (characterType: CharacterType) => void;
    private gameStartTime: number = 0;
    private enemiesKilledCount: number = 0;
    private characterType: CharacterType;

    constructor(playerId: string, characterType: CharacterType = 'spray-n-pray') {
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
            status: 'alive',
            speed: character.baseSpeed,
            projectileDamage: character.baseDamage,
            reviveProgress: 0,
            pickupRadius: 30,
            projectilesPerShot: 1,
            critChance: 0,
            critMultiplier: characterType === 'glass-cannon-carl' ? 3 : 2,
            lifeSteal: 0,
            hasBananarang: false,
            bananarangsPerShot: 0,
            collectedUpgrades: [],
            characterType: character.type,
            weaponType: character.weaponType,
        };

        this.gameState = {
            gameId: 'local',
            status: 'playing',
            players: [initialPlayer],
            enemies: [],
            projectiles: [],
            xpOrbs: [],
            wave: 1,
            teleporter: null,
            pets: [],
            orbitalSkulls: [],
            fireTrails: [],
        };

        // Pet Pal Percy starts with a pet
        if (character.startsWithPet) {
            const petEmojis = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁'];
            const randomEmoji = petEmojis[Math.floor(Math.random() * petEmojis.length)];
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

    selectUpgrade(upgradeId: string) {
        const player = this.gameState.players[0];
        const choices = this.upgradeChoices.get(player.id);
        const choice = choices?.find(c => c.id === upgradeId);
        if (!player || !choice) return;

        applyUpgradeEffect(player, choice.type);
        
        // Spawn pet if pet upgrade selected
        if (choice.type === 'pet') {
            if (!this.gameState.pets) this.gameState.pets = [];
            const petEmojis = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸'];
            const randomEmoji = petEmojis[Math.floor(Math.random() * petEmojis.length)];
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
        if (choice.type === 'orbital') {
            if (!this.gameState.orbitalSkulls) this.gameState.orbitalSkulls = [];
            const orbitalCount = player.orbitalCount || 0;
            const angleOffset = (Math.PI * 2) / orbitalCount;
            const newSkull: OrbitalSkull = {
                id: uuidv4(),
                ownerId: player.id,
                angle: angleOffset * (orbitalCount - 1), // Evenly space skulls
                radius: 60,
                damage: 10 + (player.level * 2), // Scales with level
            };
            this.gameState.orbitalSkulls.push(newSkull);
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

        this.gameState.levelingUpPlayerId = null;
        this.upgradeChoices.delete(player.id);
    }

    getUpgradeOptions(): UpgradeOption[] | null {
        if (!this.gameState.levelingUpPlayerId) return null;
        return this.upgradeChoices.get(this.gameState.levelingUpPlayerId) || null;
    }

    private tick() {
        const now = Date.now();
        const delta = (now - this.lastTick);
        this.lastTick = now;

        const state = this.gameState;
        if (state.status !== 'playing' || state.levelingUpPlayerId) return;

        const timeFactor = delta / (1000 / 60);

        this.updatePlayerMovement(state, timeFactor);
        this.updatePlayerEffects(state, delta);
        this.updateRevives(state, delta);
        this.updatePets(state, now, delta, timeFactor);
        this.updateOrbitalSkulls(state, now, delta);
        this.updateFireTrails(state, now, delta);
        this.updateEnemyAI(state, now, delta, timeFactor);
        this.updatePlayerAttacks(state, delta);
        this.updateProjectiles(state, now, delta, timeFactor);
        this.updateStatusEffects(state, delta);
        this.updateExplosions(state, now);
        this.updateChainLightning(state, now);
        this.updateXPOrbs(state);
        this.updateExtraction(state, delta);
        this.updateWaves(state, delta);
        this.updateGameStatus(state);
    }

    private updatePlayerMovement(state: GameState, timeFactor: number) {
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

    private updatePlayerEffects(state: GameState, delta: number) {
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

    private updateRevives(state: GameState, delta: number) {
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

    private updatePets(state: GameState, now: number, delta: number, timeFactor: number) {
        if (!state.pets) return;
        
        state.pets = state.pets.filter(pet => {
            const owner = state.players.find(p => p.id === pet.ownerId);
            if (!owner || owner.status === 'dead') return false;
            
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
                const nearestEnemy = state.enemies.reduce((closest, enemy) => {
                    const d = Math.hypot(enemy.position.x - pet.position.x, enemy.position.y - pet.position.y);
                    return d < closest.dist ? { enemy, dist: d } : closest;
                }, { enemy: null as Enemy | null, dist: Infinity });
                
                if (nearestEnemy.enemy && nearestEnemy.dist < 400) {
                    pet.attackCooldown = pet.attackSpeed;
                    const angle = Math.atan2(nearestEnemy.enemy.position.y - pet.position.y, nearestEnemy.enemy.position.x - pet.position.x);
                    const petProjectile: Projectile = {
                        id: uuidv4(),
                        ownerId: pet.id,
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

    private updateEnemyAI(state: GameState, now: number, delta: number, timeFactor: number) {
        const isHellhoundRound = state.isHellhoundRound || false;
        
        if (isHellhoundRound) {
            const totalHellhounds = state.totalHellhoundsInRound || 0;
            const hellhoundsKilled = state.hellhoundsKilled || 0;
            const currentHellhounds = state.enemies.filter(e => e.type === 'hellhound').length;
            const hellhoundsSpawned = (currentHellhounds + hellhoundsKilled);
            
            if (state.hellhoundSpawnTimer === undefined) {
                state.hellhoundSpawnTimer = 0;
            }
            
            state.hellhoundSpawnTimer -= delta;
            
            if (state.hellhoundSpawnTimer <= 0 && hellhoundsSpawned < totalHellhounds) {
                const packSize = Math.min(
                    Math.floor(Math.random() * 3) + 3,
                    totalHellhounds - hellhoundsSpawned
                );
                
                const side = Math.floor(Math.random() * 4);
                
                for (let i = 0; i < packSize; i++) {
                    let spawnX, spawnY;
                    
                    if (side === 0) {
                        spawnX = Math.random() * ARENA_WIDTH;
                        spawnY = -20 - (Math.random() * 30);
                    } else if (side === 1) {
                        spawnX = Math.random() * ARENA_WIDTH;
                        spawnY = ARENA_HEIGHT + 20 + (Math.random() * 30);
                    } else if (side === 2) {
                        spawnX = -20 - (Math.random() * 30);
                        spawnY = Math.random() * ARENA_HEIGHT;
                    } else {
                        spawnX = ARENA_WIDTH + 20 + (Math.random() * 30);
                        spawnY = Math.random() * ARENA_HEIGHT;
                    }
                    
                    const newHellhound = createEnemy(uuidv4(), { x: spawnX, y: spawnY }, 'hellhound', state.wave);
                    state.enemies.push(newHellhound);
                }
                
                state.hellhoundSpawnTimer = 3000 + Math.random() * 2000;
            }
        } else {
            const enemySpawnRate = 0.05 + (state.wave * 0.01);
            if (state.enemies.length < 10 * state.players.length && Math.random() < enemySpawnRate) {
                const enemyType = selectRandomEnemyType();
                const spawnX = Math.random() * ARENA_WIDTH;
                const spawnY = Math.random() > 0.5 ? -20 : ARENA_HEIGHT + 20;
                const newEnemy = createEnemy(uuidv4(), { x: spawnX, y: spawnY }, enemyType, state.wave);
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
                    }
                }
                
                if (closestPlayer.dist < 20) {
                    let incomingDamage = enemy.damage * (delta / 1000);
                    if (p.dodge && Math.random() < p.dodge) {
                        incomingDamage = 0;
                    } else {
                        if (p.armor && p.armor > 0) {
                            incomingDamage *= (1 - p.armor);
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
                    if (p.health <= 0) p.status = 'dead';
                } else {
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

    private updatePlayerAttacks(state: GameState, delta: number) {
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
                    
                    // Weapon-specific behavior
                    if (p.weaponType === 'grenade-launcher') {
                        // Boom Bringer: Single grenade with built-in explosion
                        const isCrit = Math.random() < (p.critChance || 0);
                        const damage = Math.round((p.projectileDamage) * (isCrit ? (p.critMultiplier || 2) : 1));
                        const grenade: Projectile = {
                            hitEnemies: [],
                            pierceRemaining: 0,
                            ricochetRemaining: 0,
                            id: uuidv4(),
                            ownerId: p.id,
                            position: { ...p.position },
                            velocity: { x: Math.cos(baseAngle) * 7, y: Math.sin(baseAngle) * 7 },
                            damage,
                            isCrit,
                            kind: 'bullet',
                            radius: 8,
                        };
                        state.projectiles.push(grenade);
                    } else {
                        // Standard shooting (rapid-fire and sniper-shot)
                        const shots = Math.max(1, p.projectilesPerShot || 1);
                        const spread = 10 * Math.PI / 180;
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
                    }

                    const bananaShots = p.hasBananarang ? Math.max(0, p.bananarangsPerShot || 0) : 0;
                    if (bananaShots > 0) {
                        const bananaSpread = 10 * Math.PI / 180;
                        for (let i = 0; i < bananaShots; i++) {
                            const offset = (i - (bananaShots - 1) / 2) * bananaSpread;
                            const angle = baseAngle + offset;
                            const isCrit = Math.random() < (p.critChance || 0);
                            const damage = Math.round((p.projectileDamage) * (isCrit ? (p.critMultiplier || 2) : 1));
                            const speed = 10;
                            const maxRange = 220;
                            const radius = 10;
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

    private updateProjectiles(state: GameState, now: number, delta: number, timeFactor: number) {
        state.projectiles = state.projectiles.filter(proj => {
            const owner = state.players.find(pp => pp.id === proj.ownerId);
            const radius = proj.radius ?? 8;

            if (proj.kind === 'bananarang') {
                const origin = proj.spawnPosition || proj.position;
                const distFromOrigin = Math.hypot(proj.position.x - origin.x, proj.position.y - origin.y);
                if (proj.state === 'outbound' && proj.maxRange && distFromOrigin >= proj.maxRange) {
                    proj.state = 'returning';
                }

                if (proj.state === 'returning' && owner) {
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
                    const newSpeed = Math.hypot(proj.velocity.x, proj.velocity.y);
                    proj.velocity.x = (proj.velocity.x / newSpeed) * currentSpeed;
                    proj.velocity.y = (proj.velocity.y / newSpeed) * currentSpeed;
                }
            }

            proj.position.x += proj.velocity.x * timeFactor;
            proj.position.y += proj.velocity.y * timeFactor;

            const isEnemyProjectile = state.enemies.some(e => e.id === proj.ownerId);
            if (isEnemyProjectile) {
                for (const player of state.players) {
                    if (player.status !== 'alive') continue;
                    if (Math.hypot(proj.position.x - player.position.x, proj.position.y - player.position.y) < (radius + 15)) {
                        let incomingDamage = proj.damage;
                        if (player.dodge && Math.random() < player.dodge) {
                            incomingDamage = 0;
                        } else {
                            if (player.armor && player.armor > 0) {
                                incomingDamage *= (1 - player.armor);
                            }
                            if (player.shield && player.shield > 0) {
                                const absorbed = Math.min(player.shield, incomingDamage);
                                player.shield -= absorbed;
                                incomingDamage -= absorbed;
                            }
                        }
                        player.health = Math.max(0, player.health - incomingDamage);
                        player.lastHitTimestamp = now;
                        if (player.health <= 0) player.status = 'dead';
                        return false;
                    }
                }
            }

            if (!isEnemyProjectile) {
                for (const enemy of state.enemies) {
                    if (proj.hitEnemies && proj.hitEnemies.includes(enemy.id)) continue;
                    if (Math.hypot(proj.position.x - enemy.position.x, proj.position.y - enemy.position.y) < (radius + 10)) {
                        let finalDamage = proj.damage;
                        if (owner && owner.health < owner.maxHealth * 0.3) {
                            finalDamage *= 1.5;
                        }
                        if (owner && enemy.health < enemy.maxHealth * 0.15) {
                            finalDamage = enemy.health;
                        }
                        enemy.health -= finalDamage;
                        
                        // Boom Bringer grenade explosion on hit
                        if (owner && owner.weaponType === 'grenade-launcher') {
                            if (!state.explosions) state.explosions = [];
                            state.explosions.push({
                                id: uuidv4(),
                                position: { ...proj.position },
                                radius: 60,
                                timestamp: now,
                                damage: finalDamage * 0.5,
                                ownerId: owner.id
                            });
                        }
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
                        if (!enemy.damageNumbers) enemy.damageNumbers = [];
                        enemy.damageNumbers.push({ id: uuidv4(), damage: proj.damage, isCrit: proj.isCrit || false, position: { ...enemy.position }, timestamp: now });
                        
                        if (owner && owner.chainCount && owner.chainCount > 0) {
                            const chainRange = 150;
                            const chainDamage = finalDamage * 0.7;
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
                            if (!proj.hitEnemies) proj.hitEnemies = [];
                            proj.hitEnemies.push(enemy.id);
                            
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

            const inBounds = proj.position.x > -40 && proj.position.x < ARENA_WIDTH + 40 && proj.position.y > -40 && proj.position.y < ARENA_HEIGHT + 40;
            return inBounds;
        });

        state.enemies.forEach(enemy => {
            if (enemy.damageNumbers) {
                enemy.damageNumbers = enemy.damageNumbers.filter(dmg => (now - dmg.timestamp) < 1000);
            }
        });

        const deadEnemies = state.enemies.filter(e => e.health <= 0);
        deadEnemies.forEach(dead => {
            state.xpOrbs.push({ id: uuidv4(), position: dead.position, value: dead.xpValue });
            
            // Track enemy kills
            this.enemiesKilledCount++;
            
            if (dead.type === 'hellhound' && state.isHellhoundRound) {
                state.hellhoundsKilled = (state.hellhoundsKilled || 0) + 1;
            }
            
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
        
        if (state.isHellhoundRound && state.hellhoundsKilled === state.totalHellhoundsInRound && state.enemies.length === 0) {
            state.hellhoundRoundComplete = true;
        }
    }

    private updateStatusEffects(state: GameState, delta: number) {
        state.enemies.forEach(enemy => {
            if (!enemy.statusEffects || enemy.statusEffects.length === 0) return;
            enemy.statusEffects = enemy.statusEffects.filter(effect => {
                effect.duration -= delta;
                if (effect.duration <= 0) return false;
                if (effect.damage && effect.damage > 0) {
                    const dotDamage = (effect.damage / (effect.type === 'burning' ? 2000 : 3000)) * delta;
                    enemy.health -= dotDamage;
                }
                return true;
            });
        });
    }

    private updateExplosions(state: GameState, now: number) {
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
        state.explosions = state.explosions.filter(exp => (now - exp.timestamp) < 500);
    }

    private updateChainLightning(state: GameState, now: number) {
        if (!state.chainLightning) return;
        state.chainLightning = state.chainLightning.filter(chain => (now - chain.timestamp) < 200);
    }

    private updateOrbitalSkulls(state: GameState, now: number, delta: number) {
        if (!state.orbitalSkulls) state.orbitalSkulls = [];
        if (!state.fireTrails) state.fireTrails = [];
        
        const ORBITAL_SPEED = 2; // radians per second
        const FIRE_TRAIL_INTERVAL = 100; // ms between trail spawns
        const SKULL_DAMAGE_COOLDOWN = 200; // ms between damage ticks
        
        state.orbitalSkulls = state.orbitalSkulls.filter(skull => {
            const owner = state.players.find(p => p.id === skull.ownerId);
            if (!owner || owner.status === 'dead') return false;
            
            // Rotate skull
            skull.angle += (ORBITAL_SPEED * delta / 1000);
            if (skull.angle > Math.PI * 2) skull.angle -= Math.PI * 2;
            
            // Calculate skull position
            const skullX = owner.position.x + Math.cos(skull.angle) * skull.radius;
            const skullY = owner.position.y + Math.sin(skull.angle) * skull.radius;
            
            // Spawn fire trail periodically
            if (!skull.lastDamageTimestamp || (now - skull.lastDamageTimestamp) >= FIRE_TRAIL_INTERVAL) {
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
            state.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.position.x - skullX, enemy.position.y - skullY);
                if (dist < 20) { // Skull hitbox radius
                    enemy.health -= skull.damage;
                    enemy.lastHitTimestamp = now;
                    
                    // Apply burning status effect from skulls
                    if (!enemy.statusEffects) enemy.statusEffects = [];
                    const burnDamage = skull.damage * 0.5; // 50% of skull damage as burn
                    const existing = enemy.statusEffects.find(e => e.type === 'burning');
                    if (existing) {
                        existing.duration = 2000; // Refresh duration
                        existing.damage = Math.max(existing.damage || 0, burnDamage);
                    } else {
                        enemy.statusEffects.push({
                            type: 'burning',
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
        
        state.fireTrails.forEach(trail => {
            // Check if enough time has passed for next damage tick
            const timeSinceSpawn = now - trail.timestamp;
            
            // Damage enemies in trail
            state.enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.position.x - trail.position.x, enemy.position.y - trail.position.y);
                if (dist < trail.radius) {
                    // Apply damage periodically
                    if (timeSinceSpawn % FIRE_TRAIL_DAMAGE_INTERVAL < 50) { // Small window for damage tick
                        enemy.health -= trail.damage * (delta / 1000);
                        enemy.lastHitTimestamp = now;
                        
                        // Apply burning status
                        if (!enemy.statusEffects) enemy.statusEffects = [];
                        const existing = enemy.statusEffects.find(e => e.type === 'burning');
                        if (existing) {
                            existing.duration = 2000;
                        } else {
                            enemy.statusEffects.push({
                                type: 'burning',
                                damage: trail.damage * 0.3,
                                duration: 2000,
                            });
                        }
                    }
                }
            });
        });
        
        // Remove old fire trails
        state.fireTrails = state.fireTrails.filter(trail => (now - trail.timestamp) < FIRE_TRAIL_DURATION);
    }

    private updateXPOrbs(state: GameState) {
        state.players.forEach(p => {
            if (p.status !== 'alive') return;
            
            // First, move orbs within pickup radius directly to player
            state.xpOrbs.forEach(orb => {
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
            state.xpOrbs = state.xpOrbs.filter(orb => {
                const distance = Math.hypot(p.position.x - orb.position.x, p.position.y - orb.position.y);
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
                        newlyUnlocked.forEach(charType => this.onUnlock!(charType));
                    }
                }
                
                p.xp -= p.xpToNextLevel;
                p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5);
                state.levelingUpPlayerId = p.id;
                const choices = getRandomUpgrades(3).map(o => ({ ...o, id: uuidv4() }));
                this.upgradeChoices.set(p.id, choices);
            }
        });
    }

    private updateExtraction(state: GameState, delta: number) {
        if (!state.teleporter) return;
        
        const alivePlayers = state.players.filter(p => p.status === 'alive');
        
        alivePlayers.forEach(player => {
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
                    const allExtracted = alivePlayers.every(p => 
                        (p.extractionProgress || 0) >= EXTRACTION_DURATION
                    );
                    
                    if (allExtracted) {
                        state.status = 'won';
                    }
                }
            } else {
                // Player left extraction zone - reset progress
                player.extractionProgress = 0;
            }
        });
    }

    private updateWaves(state: GameState, delta: number) {
        if (state.hellhoundRoundComplete) {
            const alivePlayers = state.players.filter(p => p.status === 'alive');
            if (alivePlayers.length > 0 && !state.levelingUpPlayerId) {
                const player = alivePlayers[0];
                state.levelingUpPlayerId = player.id;
                const legendaryUpgrades = getRandomUpgrades(3, 'legendary');
                this.upgradeChoices.set(player.id, legendaryUpgrades.map(o => ({ ...o, id: uuidv4() })));
            }
            
            const playersWhoGotUpgrades = alivePlayers.filter(p => 
                p.collectedUpgrades?.some(u => u.rarity === 'legendary')
            );
            
            if (playersWhoGotUpgrades.length === alivePlayers.length || !state.levelingUpPlayerId) {
                state.isHellhoundRound = false;
                state.hellhoundRoundComplete = false;
                state.hellhoundsKilled = 0;
                state.totalHellhoundsInRound = 0;
                state.wave++;
                this.waveTimer = 0;
            }
            return;
        }
        
        this.waveTimer += delta;
        if (this.waveTimer >= WAVE_DURATION) {
            state.wave++;
            this.waveTimer = 0;
            
            if (state.wave >= HELLHOUND_ROUND_START && (state.wave - HELLHOUND_ROUND_START) % HELLHOUND_ROUND_INTERVAL === 0) {
                state.isHellhoundRound = true;
                state.hellhoundsKilled = 0;
                state.hellhoundRoundComplete = false;
                state.hellhoundSpawnTimer = 0;
                state.totalHellhoundsInRound = Math.min(24, 8 + (state.wave - HELLHOUND_ROUND_START) * 2);
            }
            
            if (state.wave > WIN_WAVE && !state.teleporter) {
                state.teleporter = { id: 'teleporter', position: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, radius: 50 };
            }
        }
    }

    private updateGameStatus(state: GameState) {
        const previousStatus = state.status;
        
        if (state.players.every(p => p.status === 'dead')) {
            state.status = 'gameOver';
        }

        // Save stats when game ends
        if (previousStatus === 'playing' && (state.status === 'gameOver' || state.status === 'won')) {
            this.saveGameStats(state);
        }
    }

    private saveGameStats(state: GameState) {
        const survivalTimeMs = Date.now() - this.gameStartTime;
        saveLastRunStats({
            characterType: this.characterType,
            waveReached: state.wave,
            enemiesKilled: this.enemiesKilledCount,
            survivalTimeMs,
            isVictory: state.status === 'won',
            timestamp: Date.now(),
        });
    }
}
