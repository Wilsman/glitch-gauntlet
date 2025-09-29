import { Hono } from "hono";
import { Env } from './core-utils';
import type { ApiResponse, GameState, InputState, UpgradeOption } from '@shared/types';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    app.post('/api/game/create', async (c) => {
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const { gameId, playerId } = await durableObjectStub.createGameSession();
        return c.json({ success: true, data: { gameId, playerId } } satisfies ApiResponse<{ gameId: string, playerId: string }>);
    });
    app.get('/api/game/:gameId', async (c) => {
        const { gameId } = c.req.param();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const gameState = await durableObjectStub.getGameState(gameId);
        if (!gameState) {
            return c.json({ success: false, error: 'Game session not found' }, 404);
        }
        return c.json({ success: true, data: gameState } satisfies ApiResponse<GameState>);
    });
    app.post('/api/game/:gameId/join', async (c) => {
        const { gameId } = c.req.param();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const result = await durableObjectStub.joinGameSession(gameId);
        if (!result) {
            return c.json({ success: false, error: 'Game session not found or is full' }, 404);
        }
        return c.json({ success: true, data: { playerId: result.playerId } } satisfies ApiResponse<{ playerId: string }>);
    });
    app.post('/api/game/:gameId/update', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, input } = await c.req.json<{ playerId: string, input: InputState }>();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const gameState = await durableObjectStub.updateGameState(gameId, playerId, input);
        if (!gameState) {
            return c.json({ success: false, error: 'Failed to update game state' }, 500);
        }
        return c.json({ success: true, data: gameState } satisfies ApiResponse<GameState>);
    });
    app.post('/api/game/:gameId/upgrade', async (c) => {
        const { gameId } = c.req.param();
        const { playerId, upgradeId } = await c.req.json<{ playerId: string, upgradeId: string }>();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        await durableObjectStub.selectUpgrade(gameId, playerId, upgradeId);
        return c.json({ success: true });
    });
    app.get('/api/game/:gameId/upgrades', async (c) => {
        const { gameId } = c.req.param();
        const durableObjectStub = c.env.GlobalDurableObject.get(c.env.GlobalDurableObject.idFromName("global"));
        const upgrades = await durableObjectStub.getUpgradeOptions(gameId);
        if (!upgrades) {
            return c.json({ success: false, error: 'No upgrades available' }, 404);
        }
        return c.json({ success: true, data: upgrades } satisfies ApiResponse<UpgradeOption[]>);
    });
}