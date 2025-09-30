# Local Mode Implementation

## Overview
Added a new **Local Mode** that runs the game entirely client-side without requiring Cloudflare Durable Objects. The existing **Host Mode** (multiplayer with Cloudflare) remains fully functional.

## Architecture: Shared Game Logic

All game logic now lives in the **`shared/`** directory as a **single source of truth**:
- `shared/types.ts` - Type definitions
- `shared/upgrades.ts` - Upgrade definitions and selection
- `shared/upgradeEffects.ts` - Upgrade effect application
- `shared/enemyConfig.ts` - Enemy configurations and spawning

Both the **worker** (Durable Object) and **client** (LocalGameEngine) import from these shared files, ensuring:
- ✅ No code duplication
- ✅ Single place to add enemies/upgrades
- ✅ Guaranteed consistency between modes
- ✅ Type safety across the entire codebase

## Changes Made

### 1. Local Game Engine (`src/lib/LocalGameEngine.ts`)
- Complete client-side game engine that mirrors the Durable Object logic
- Handles all game state, physics, enemy spawning, upgrades, and combat
- Runs independently without any server communication
- Supports all existing game features: waves, enemies, upgrades, pets, hellhound rounds, etc.
- **Imports game logic from `@shared/`** (same as server)

### 3. Local Game Loop Hook (`src/hooks/useLocalGameLoop.ts`)
- Handles keyboard input for local mode
- Updates game state at ~30 FPS
- Manages input state and pausing

### 4. HomePage Updates (`src/pages/HomePage.tsx`)
- Added **"Play Local"** button (yellow) for single-player local mode
- Existing **"Host Game"** button (cyan) for multiplayer Cloudflare mode
- **"Join Game"** functionality remains unchanged

### 5. GamePage Updates (`src/pages/GamePage.tsx`)
- Detects mode based on gameId (`local` = local mode, anything else = host mode)
- Routes local mode through `LocalGameEngine` instead of API calls
- Routes host mode through existing API endpoints
- Handles upgrades, input, and state updates differently per mode
- Both modes use the same UI components (GameCanvas, StatsPanel, etc.)

## How It Works

### Local Mode Flow:
1. User clicks "Play Local" → navigates to `/game/local?playerId=local-{timestamp}`
2. GamePage creates a `LocalGameEngine` instance with the player ID
3. Engine starts ticking at 50ms intervals (20 TPS)
4. `useLocalGameLoop` captures keyboard input and updates engine
5. Game state updates are applied directly to Zustand store
6. All game logic runs client-side in the browser

### Host Mode Flow (unchanged):
1. User clicks "Host Game" → API call to `/api/game/create`
2. Server creates Durable Object session
3. GamePage polls server for state updates
4. `useGameLoop` sends input to server via `/api/game/{id}/update`
5. Server processes game logic and returns updated state

## Key Features Preserved
- ✅ All enemy types (grunt, slugger, hellhound)
- ✅ Wave progression and difficulty scaling
- ✅ Hellhound rounds (every 5 waves)
- ✅ All upgrades (common, uncommon, legendary, boss, lunar, void)
- ✅ Pet system
- ✅ Status effects (fire, poison, ice)
- ✅ Projectile modifiers (pierce, chain, ricochet, homing)
- ✅ Player stats and progression
- ✅ Win condition (teleporter after wave 5)
- ✅ Game over on death

## Benefits
1. **No Server Required**: Local mode works completely offline
2. **Zero Latency**: No network round-trips for game updates
3. **No Cloudflare Costs**: Local mode doesn't use Durable Objects
4. **Clean Separation**: Both modes coexist without interfering
5. **Same Experience**: Identical gameplay in both modes

## Testing
- Local mode: Click "Play Local" on homepage
- Host mode: Click "Host Game" on homepage (requires Cloudflare worker)
- Both modes should work independently without breaking each other

## Notes
- ESLint may show false positive import errors for `*-client.ts` files - these resolve at compile time
- Local mode is single-player only (no multiplayer support)
- Game state is not persisted (refreshing loses progress)
- Host mode still supports multiplayer with join codes
