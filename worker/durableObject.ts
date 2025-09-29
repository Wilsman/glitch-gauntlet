import { DurableObject } from "cloudflare:workers";
import type { GameState, Player, InputState, UpgradeOption, Enemy, Projectile, XpOrb, Teleporter } from '@shared/types';
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
const UPGRADE_OPTIONS: Omit<UpgradeOption, 'id'>[] = [
    { type: 'attackSpeed', title: 'Caffeinated Hamster Wheel', description: 'Your trigger finger discovers espresso. +20% pew speed.' },
    { type: 'projectileDamage', title: 'Angry Spicy Bullets', description: 'Infused with hot sauce. +5 damage and mild regret.' },
    { type: 'playerSpeed', title: 'Greased Lightning Shoes', description: 'Slick soles, quick goals. +15% zoom-zoom.' },
    { type: 'maxHealth', title: 'Vitamin Gummies (Probably Safe)', description: 'Chewy HP gummies. +20 max HP and heal 20.' },
    { type: 'pickupRadius', title: 'Industrial Shop‑Vac', description: 'Vroom vroom loot vacuum. +20% XP suck radius.' },
    { type: 'multiShot', title: 'Two‑For‑One Tuesdays', description: 'Buy one bullet, get one free. +1 projectile per shot.' },
    { type: 'critChance', title: 'Red Numbers Go Brrr', description: '10% more crit chance. Double damage, double flex.' },
    { type: 'lifeSteal', title: 'Thirsty Bullets', description: 'Hydration via violence. Heal 5% of damage dealt.' },
];
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
        switch (choice.type) {
            case 'attackSpeed':
                player.attackSpeed = Math.max(60, player.attackSpeed * 0.8);
                break;
            case 'projectileDamage':
                player.projectileDamage += 5;
                break;
            case 'playerSpeed':
                player.speed *= 1.15;
                break;
            case 'maxHealth':
                player.maxHealth += 20;
                player.health = Math.min(player.maxHealth, player.health + 20);
                break;
            case 'pickupRadius':
                player.pickupRadius = Math.min(120, player.pickupRadius * 1.2);
                break;
            case 'multiShot':
                player.projectilesPerShot = Math.min(5, player.projectilesPerShot + 1);
                break;
            case 'critChance':
                player.critChance = Math.min(0.5, player.critChance + 0.10);
                break;
            case 'lifeSteal':
                player.lifeSteal = Math.min(0.30, player.lifeSteal + 0.05);
                break;
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
            this.updateRevives(state, delta);
            this.updateEnemyAI(state, now, delta, timeFactor);
            this.updatePlayerAttacks(state, delta);
            this.updateProjectiles(state, now, timeFactor);
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
                    p.health = Math.max(0, p.health - (enemy.damage * (delta / 1000)));
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
                    const shots = Math.max(1, p.projectilesPerShot || 1);
                    const spread = 10 * Math.PI / 180; // 10 degrees between projectiles
                    for (let i = 0; i < shots; i++) {
                        const offset = (i - (shots - 1) / 2) * spread;
                        const angle = baseAngle + offset;
                        const isCrit = Math.random() < (p.critChance || 0);
                        const damage = Math.round((p.projectileDamage) * (isCrit ? (p.critMultiplier || 2) : 1));
                        const newProjectile: Projectile = {
                            id: uuidv4(),
                            ownerId: p.id,
                            position: { ...p.position },
                            velocity: { x: Math.cos(angle) * 10, y: Math.sin(angle) * 10 },
                            damage,
                            isCrit
                        };
                        state.projectiles.push(newProjectile);
                    }
                }
            }
        });
    }
    updateProjectiles(state: GameState, now: number, timeFactor: number) {
        state.projectiles = state.projectiles.filter(proj => {
            proj.position.x += proj.velocity.x * timeFactor;
            proj.position.y += proj.velocity.y * timeFactor;
            for (const enemy of state.enemies) {
                if (Math.hypot(proj.position.x - enemy.position.x, proj.position.y - enemy.position.y) < 20) {
                    enemy.health -= proj.damage;
                    // Life steal on hit
                    const owner = state.players.find(pp => pp.id === proj.ownerId);
                    if (owner && owner.lifeSteal && owner.lifeSteal > 0) {
                        owner.health = Math.min(owner.maxHealth, owner.health + proj.damage * owner.lifeSteal);
                        owner.lastHealedTimestamp = now;
                    }
                    enemy.lastHitTimestamp = now;
                    if (proj.isCrit) enemy.lastCritTimestamp = now;
                    return false;
                }
            }
            return proj.position.x > -10 && proj.position.x < ARENA_WIDTH + 10 && proj.position.y > -10 && proj.position.y < ARENA_HEIGHT + 10;
        });
        const deadEnemies = state.enemies.filter(e => e.health <= 0);
        deadEnemies.forEach(dead => state.xpOrbs.push({ id: uuidv4(), position: dead.position, value: dead.xpValue }));
        state.enemies = state.enemies.filter(e => e.health > 0);
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
                const choices = [...UPGRADE_OPTIONS].sort(() => 0.5 - Math.random()).slice(0, 3).map(o => ({ ...o, id: uuidv4() }));
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
