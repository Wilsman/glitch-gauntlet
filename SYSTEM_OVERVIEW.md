# Glitch Gauntlet: System Overview

## 🌌 Introduction
**Glitch Gauntlet** is a retro-themed, chaotic, 2-4 player online co-op survival game. Inspired by classic arcade aesthetics and modern "survivor-like" mechanics, it features fast-paced combat, shared loot, and deep strategic progression.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Rendering**: [React Konva](https://konvajs.org/docs/react/index.html) (HTML5 Canvas)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Audio**: [Tone.js](https://tonejs.github.io/)

### Backend
- **Platform**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Routing**: [Hono](https://hono.dev/)
- **Real-time Synchronization**: [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Persistence**: Durable Object Storage

### Shared
- **Language**: TypeScript (Shared types and configs between frontend and backend)

## 🏗️ Architecture

### Autoritative Game Server
The backend uses **Cloudflare Durable Objects** to maintain a single, authoritative state for each game session. 
- **Game Loop**: A server-side tick (50ms) updates movements, AI, collisions, and wave progression.
- **Durable State**: All entities (players, enemies, projectiles, XP orbs) are synchronized across all connected clients.

### Local Mode vs. Online Mode
- **Local Mode**: Runs entirely in the browser using the same logic as the server (via `LocalGameEngine.ts`). Accessible via `/game/local`.
- **Online Mode**: Communicates with the Cloudflare Worker backend for multi-player synchronization.

### Data Flow
1. **Client**: Captures user input (WASD/Arrows).
2. **Sync**: Input is sent to the Durable Object.
3. **Server**: Durable Object updates the `GameState` and persists it.
4. **Client**: `useGameLoop` hook polls the state (or receives updates) and React Konva renders the new frame.

## 🎨 Aesthetic & Design
- **Theme**: 90s Cyberpunk / Retro-futurism.
- **Visuals**: Neon glows, pixel art emojis, CRT scanline effects, vibrant gradients.
- **Audio**: Chiptune-inspired adaptive music and retro sound effects.
