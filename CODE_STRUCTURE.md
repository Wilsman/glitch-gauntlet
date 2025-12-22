# Glitch Gauntlet: Code Structure

## 📂 Directory Layout

### `/src` (Frontend)
- **`/components`**: UI components (shadcn/ui), HUD, Panels, and the core `GameCanvas.tsx`.
- **`/hooks`**: Custom React hooks for game logic, audio, and state management.
- **`/lib`**: Utility libraries, progression storage, and the `LocalGameEngine.ts`.
- **`/pages`**: Entry points for different application views.
- **`App.css` / `index.css`**: Global styles and neon theme configuration.

### `/worker` (Backend)
- **`durableObject.ts`**: Authoritative server-side game engine and state management.
- **`index.ts`**: Main entry point for Cloudflare Worker.
- **`userRoutes.ts` / `leaderboardRoutes.ts`**: API endpoints.

### `/shared` (Common)
- **`types.ts`**: Source of truth for all game interfaces and types.
- **`upgrades.ts` / `upgradeEffects.ts`**: Definitions and logic for the upgrade system.
- **`characterConfig.ts` / `enemyConfig.ts` / `bossConfig.ts`**: Game balance and entity configurations.

## 🔑 Key Files & Logic Locations

### Game engine
- **Server**: `worker/durableObject.ts` -> `tick()` function contains the main logic.
- **Client**: `lib/LocalGameEngine.ts` -> Used for solo play.

### Rendering
- **`src/components/GameCanvas.tsx`**: Uses `react-konva` to draw players, enemies, and FX.

### State Management
- **`src/hooks/useGameStore.ts`**: Zustand store for frontend game state and UI visibility.

### Combat & Collision
- Handled primarily on the server (Durable Object) or in the `LocalGameEngine` on the client.
- Logic is shared via the types and effects in the `/shared` directory.

## 🛠️ Dev Commands
- `bun run dev`: Start local development (Vite + local Wrangler).
- `bun run build`: Build for production.
- `bun run deploy`: Deploy to Cloudflare.
