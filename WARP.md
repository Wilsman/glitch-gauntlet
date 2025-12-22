# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Glitch Gauntlet is a retro-themed, 2-4 player online co-op survival game built on Cloudflare Workers and Durable Objects. Players battle hordes of enemies in neon-drenched arenas with drop-in/drop-out multiplayer, shared loot, and personal upgrades.

## Key Commands

### Development
```powershell
bun install              # Install dependencies
bun run dev              # Start Vite dev server on http://localhost:3001
bun run build            # Build frontend and prepare worker for deployment
bun run preview          # Preview production build locally
bun run lint             # Run ESLint (outputs to JSON, uses cache)
bun run deploy           # Build and deploy to Cloudflare
bun run cf-typegen       # Generate TypeScript types from wrangler config
```

### Database Migrations
Database migrations are in `migrations/` directory. Apply them manually using Wrangler CLI:
```powershell
wrangler d1 execute prod-d1-cnk --file=migrations/0001_create_leaderboard.sql
```

## Architecture

### Three-Tier Structure
The codebase is organized into three main directories:

1. **`src/`** - React frontend application
   - `pages/` - Main application views (HomePage, GamePage, GameOverPage, GameWonPage)
   - `components/` - Reusable UI components (uses shadcn/ui)
   - `hooks/` - Custom React hooks and Zustand stores for state management
   - `lib/` - Utility functions and helpers
   - `assets/` - Static assets

2. **`worker/`** - Cloudflare Worker backend (Hono-based API)
   - `index.ts` - **DO NOT MODIFY** - Core worker setup with CORS, logging, error handling
   - `userRoutes.ts` - Add new API endpoints here
   - `durableObject.ts` - Core game logic in `GlobalDurableObject` class
   - `leaderboardRoutes.ts` - Leaderboard API endpoints
   - `leaderboardUtils.ts` - Leaderboard utility functions
   - `core-utils.ts` - Shared worker utilities

3. **`shared/`** - Shared TypeScript types between frontend and backend
   - `types.ts` - Core game types (Player, Enemy, GameState, etc.)
   - `characterConfig.ts` - Character definitions and stats
   - `enemyConfig.ts` - Enemy type definitions
   - `bossConfig.ts` - Boss configurations
   - `upgrades.ts` - Upgrade system definitions
   - `upgradeEffects.ts` - Upgrade effect implementations

### Real-Time Game Architecture

**Durable Objects for State**: The game uses a single Durable Object (`GlobalDurableObject`) to manage all game sessions. Each game has a unique `gameId` and maintains its state in-memory with periodic persistence to Durable Object storage.

**Game Loop**: The Durable Object runs a 50ms tick rate game loop (`TICK_RATE = 50`) that:
- Updates player movement and attacks
- Processes enemy AI and spawning
- Handles collision detection
- Manages wave progression
- Applies status effects and upgrades
- Persists game state to storage

**Client-Server Model**: Frontend polls the backend (via `/api/game/:gameId`) to receive updated game state and renders it using React Konva (HTML5 Canvas). Player inputs are sent via `/api/game/:gameId/update`.

### API Patterns

All API responses follow the structure:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Key endpoints:
- `POST /api/game/create` - Create new game session
- `POST /api/game/:gameId/join` - Join existing game
- `GET /api/game/:gameId` - Get current game state
- `POST /api/game/:gameId/update` - Send player input
- `POST /api/game/:gameId/upgrade` - Select player upgrade
- `POST /api/leaderboard/submit` - Submit score
- `GET /api/leaderboard/:category` - Get leaderboard entries

### Path Aliases

TypeScript paths are configured in `tsconfig.json`:
- `@/*` → `./src/*` (frontend code)
- `@shared/*` → `./shared/*` (shared types)

Use these aliases consistently in imports:
```typescript
import { GameState } from '@shared/types';
import { Button } from '@/components/ui/button';
```

### Database (D1)

Cloudflare D1 database is used for leaderboards:
- Binding: `prod_d1_cnk` (configured in `wrangler.jsonc`)
- Weekly leaderboard resets via cron (`0 8 * * 1` - Mondays at 8 AM)
- Archive system preserves historical data

## Development Guidelines

### Backend Development

**Adding New API Routes**: Add routes in `worker/userRoutes.ts`. Never modify `worker/index.ts`.

**Modifying Game Logic**: Edit `worker/durableObject.ts`. The game state is maintained in the `GlobalDurableObject` class. Key methods:
- `tick()` - Main game loop
- `updatePlayerMovement()` - Handle player position
- `updateEnemyAI()` - Enemy behavior
- `updateWaves()` - Wave spawning and progression

**Accessing Durable Objects**:
```typescript
const stub = c.env.GlobalDurableObject.get(
  c.env.GlobalDurableObject.idFromName("global")
);
```

### Frontend Development

**State Management**: Use Zustand for client state. Create stores in `src/hooks/`.

**Rendering**: Game canvas uses React Konva. Main game rendering logic is in `src/pages/GamePage.tsx`.

**Styling**: TailwindCSS with shadcn/ui components. Configuration in `tailwind.config.js`.

**Error Handling**: Client errors are automatically reported to `/api/client-errors` via `ErrorBoundary` and `RouteErrorBoundary` components.

### Type Safety

All shared types must be defined in `shared/types.ts` to ensure frontend-backend consistency. When adding new game features:
1. Define types in `shared/types.ts`
2. Implement backend logic in `worker/durableObject.ts`
3. Update frontend rendering in `src/pages/GamePage.tsx`

### Configuration Files

- `wrangler.jsonc` - **DO NOT MODIFY** (marked as strictly forbidden)
- `vite.config.ts` - Vite configuration with Cloudflare plugin
- `eslint.config.js` - ESLint rules (flat config format)
- `tsconfig.json` - Base TypeScript config with project references
- `tsconfig.app.json` - Frontend TypeScript config
- `tsconfig.worker.json` - Worker TypeScript config

### ESLint Notes

- Runs with `--cache` flag to improve performance
- Outputs JSON format (`-f json`)
- Key disabled rules: `prefer-const`, `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`
- React hooks rules are enforced strictly
- Import resolution configured for TypeScript paths

### Game Constants

Defined in `worker/durableObject.ts`:
- `MAX_PLAYERS = 4` - Maximum players per game
- `ARENA_WIDTH = 1280, ARENA_HEIGHT = 720` - Game arena dimensions
- `TICK_RATE = 50` - Game loop tick interval (ms)
- `WAVE_DURATION = 20000` - Wave duration (20 seconds)
- `WIN_WAVE = 5` - Wave number for victory
- `REVIVE_DURATION = 3000` - Revive time (3 seconds)

## Testing

No test framework is currently configured. If adding tests, determine the appropriate approach based on the codebase needs (e.g., Vitest for unit tests, Playwright for E2E).

## Deployment

Deploy to Cloudflare using `bun run deploy`. This:
1. Builds the Vite frontend
2. Packages the worker code
3. Deploys via Wrangler CLI

Ensure you're logged into Wrangler (`wrangler login`) before deploying.
