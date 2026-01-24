import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import "@/index.css";
import { unlockAllCharacters } from "@/lib/progressionStorage";

// Expose cheat commands to the console
(window as any).cheat_unlockAllCharacters = () => {
  unlockAllCharacters();
  console.log(
    "%c🔓 ALL CHARACTERS UNLOCKED! %cRefresh the page or re-open character select to see changes.",
    "color: #00FF00; font-weight: bold; font-size: 1.2em;",
    "color: #00FFFF;",
  );
};

import { HomePage } from "@/pages/HomePage";
import GamePage from "@/pages/GamePage";
import GameOverPage from "./pages/GameOverPage";
import GameWonPage from "./pages/GameWonPage";
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/game/:gameId",
    element: <GamePage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/gameover/:gameId",
    element: <GameOverPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/gamewon/:gameId",
    element: <GameWonPage />,
    errorElement: <RouteErrorBoundary />,
  },
]);
// Do not touch this code
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
);
