# Glitch Gauntlet

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Wilsman/glitch-gauntlet)

A retro-themed, chaotic, co-op survival game where players team up to fight hordes of enemies in neon-drenched arenas.

Glitch Gauntlet is a chaotic, retro-themed, 2-4 player online co-op survival game. Players team up to battle relentless hordes of enemies in vibrant, neon-drenched arenas. The core experience revolves around fast-paced, auto-attacking combat, shared loot collection, and strategic upgrade choices. Players host or join game sessions, choosing their character and difficulty. Gameplay is drop-in/drop-out, with the game's difficulty dynamically scaling with the number of players. The game features a distinct 'Retro' aesthetic, with pixel art, glitch effects, CRT scanlines, and a neon color palette, evoking the feel of classic 90s arcade games.

## ✨ Key Features

-   **Online Co-op:** Team up with 2-4 players in fast-paced, chaotic arenas.
-   **Drop-in/Drop-out:** Seamlessly join and leave games in progress.
-   **Dynamic Difficulty:** Enemy scaling adjusts based on the number of active players.
-   **Shared Loot, Personal Upgrades:** Cooperate to collect resources, but level up and choose your own path.
-   **Retro-Futuristic Aesthetic:** Immerse yourself in a world of neon glows, pixel art, and CRT scanlines.
-   **Powered by Cloudflare:** Built on a modern, low-latency stack using Cloudflare Workers and Durable Objects.

## 🛠️ Technology Stack

-   **Frontend:**
    -   [React](https://react.dev/)
    -   [Vite](https://vitejs.dev/)
    -   [Tailwind CSS](https://tailwindcss.com/)
    -   [shadcn/ui](https://ui.shadcn.com/)
    -   [Zustand](https://zustand-demo.pmnd.rs/) for state management
    -   [Framer Motion](https://www.framer.com/motion/) for animations
    -   [React Konva](https://konvajs.org/docs/react/index.html) for HTML5 Canvas rendering
-   **Backend:**
    -   [Cloudflare Workers](https://workers.cloudflare.com/)
    -   [Hono](https://hono.dev/) for routing
    -   [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/) for real-time state management
-   **Language:** [TypeScript](https://www.typescriptlang.org/)

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) package manager
-   [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) logged into your Cloudflare account.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/glitch_gauntlet.git
    cd glitch_gauntlet
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

### Running Locally

To start the development server, which includes both the Vite frontend and the local Wrangler server for the backend, run:

```bash
bun run dev
```

This will start the application, typically available at `http://localhost:3000`.

## 🏗️ Project Structure

The project is organized into three main directories:

-   `src/`: Contains the entire React frontend application, including pages, components, hooks, and styles.
-   `worker/`: Contains the Cloudflare Worker backend code, including the Hono API routes (`userRoutes.ts`) and the core game logic within the Durable Object (`durableObject.ts`).
-   `shared/`: Contains TypeScript types and interfaces that are shared between the frontend and backend to ensure type safety.

## 🔧 Development

### Backend Development

-   **API Routes:** New backend endpoints should be added in `worker/userRoutes.ts`.
-   **Game Logic:** The core stateful game logic resides in the `GlobalDurableObject` class in `worker/durableObject.ts`.

### Frontend Development

-   **Pages:** Application views are located in `src/pages/`.
-   **Components:** Reusable UI components are in `src/components/`. We use `shadcn/ui` for the base component library.
-   **State Management:** Client-side state is managed with Zustand. Game state stores can be created in `src/hooks/`.

## ☁️ Deployment

This project is designed for easy deployment to Cloudflare's global network.

1.  **Build the project:**
    This command bundles the frontend and prepares the worker for deployment.
    ```bash
    bun run build
    ```

2.  **Deploy to Cloudflare:**
    This command deploys your application using the Wrangler CLI.
    ```bash
    bun run deploy
    ```

Alternatively, you can deploy directly from your GitHub repository.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Wilsman/glitch-gauntlet)

## ⚖️ License

This project is licensed under the MIT License. See the `LICENSE` file for details.