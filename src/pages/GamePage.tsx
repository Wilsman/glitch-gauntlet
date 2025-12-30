import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useGameStore } from "@/hooks/useGameStore";
import GameCanvas from "@/components/GameCanvas";
import type {
  ApiResponse,
  GameState,
  UpgradeOption,
  Player,
  CharacterType,
} from "@shared/types";
import { Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useLocalGameLoop } from "@/hooks/useLocalGameLoop";
import { useGameAudio } from "@/hooks/useGameAudio";
import UpgradeModal from "@/components/UpgradeModal";
import { SettingsPanel } from "@/components/SettingsPanel";
import StatsPanel from "@/components/StatsPanel";
import PlayerListPanel from "@/components/PlayerListPanel";
import CollectedUpgradesPanel from "@/components/CollectedUpgradesPanel";
import PetStatsPanel from "@/components/PetStatsPanel";
import BossDefeatedModal from "@/components/BossDefeatedModal";
import UnifiedHUD from "@/components/UnifiedHUD";
import { LocalGameEngine } from "@/lib/LocalGameEngine";
import TestingArenaPanel from "@/components/TestingArenaPanel";
import { toast } from "@/components/ui/sonner";
import { getCharacter } from "@shared/characterConfig";
import { submitLeaderboardScore } from "@/lib/leaderboardApi";
import { getPlayerName, getLastRunStats } from "@/lib/progressionStorage";

const EMPTY_PLAYERS: Player[] = [];

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isLocalMode = gameId === "local";

  const setGameState = useGameStore((state) => state.setGameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const closeUpgradeModal = useGameStore((state) => state.closeUpgradeModal);
  const openUpgradeModal = useGameStore((state) => state.openUpgradeModal);
  const isUpgradeModalOpen = useGameStore((state) => state.isUpgradeModalOpen);
  const [isTestingArenaOpen, setIsTestingArenaOpen] = useState(false);
  const rawGameState = useGameStore((state) => state.gameState);

  const activeGameState = useMemo(() => {
    if (!rawGameState || !gameId) return null;
    // For local mode, always use the game state since gameId is always 'local'
    if (isLocalMode) return rawGameState;
    return rawGameState.gameId === gameId ? rawGameState : null;
  }, [rawGameState, gameId, isLocalMode]);

  const players = activeGameState?.players ?? EMPTY_PLAYERS;
  const levelingUpPlayerId = activeGameState?.levelingUpPlayerId ?? null;
  const gameStatus = activeGameState?.status ?? null;
  const wave = activeGameState?.wave ?? 0;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCopied, setErrorCopied] = useState(false);
  const localEngineRef = useRef<LocalGameEngine | null>(null);
  const lastLevelUpPlayerRef = useRef<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [gameId]);

  const isPaused = !!levelingUpPlayerId;
  const isLocalPlayerLevelingUp = levelingUpPlayerId === localPlayerId;

  // Use appropriate game loop based on mode
  useGameLoop(isLocalMode ? undefined : gameId, isPaused);
  useLocalGameLoop(
    isLocalMode ? localEngineRef.current : null,
    isPaused || isTestingArenaOpen
  );

  useGameAudio();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "\\") {
        if (isLocalMode) {
          setIsTestingArenaOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocalMode]);

  // Sync engine pause state with Testing Arena visibility
  useEffect(() => {
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.setIsPaused(isTestingArenaOpen);
    }
  }, [isTestingArenaOpen, isLocalMode]);

  useEffect(() => {
    if (!gameStatus || !gameId) return;

    if (gameStatus === "gameOver" || gameStatus === "won") {
      // Submit to leaderboard if in local mode and player has a name
      if (isLocalMode) {
        const playerName = getPlayerName();
        const lastRun = getLastRunStats();

        console.log("Game ended with status:", gameStatus);
        console.log("Last run stats:", lastRun);

        if (playerName && lastRun) {
          const submission = {
            playerName,
            characterType: lastRun.characterType,
            waveReached: lastRun.waveReached,
            enemiesKilled: lastRun.enemiesKilled,
            survivalTimeMs: lastRun.survivalTimeMs,
            isVictory: lastRun.isVictory,
          };
          console.log("Submitting to leaderboard:", submission);

          submitLeaderboardScore(submission)
            .then((result) => {
              console.log("Score submitted to leaderboard:", result);
            })
            .catch((error) => {
              console.error("Failed to submit score:", error);
            });
        }
      }

      // Navigate to appropriate end screen
      if (gameStatus === "gameOver") {
        navigate(`/gameover/${gameId}`);
      } else {
        navigate(`/gamewon/${gameId}`);
      }
    }
  }, [gameStatus, navigate, gameId, isLocalMode]);

  useEffect(() => {
    if (!gameId) {
      setError("No game ID provided.");
      setIsLoading(false);
      return;
    }

    if (!localPlayerId) {
      navigate("/");
      return;
    }

    if (isLocalMode) {
      // Local mode - create local game engine
      const playerIdFromUrl = searchParams.get("playerId");
      if (!playerIdFromUrl) {
        setError("No player ID provided for local game.");
        setIsLoading(false);
        return;
      }

      const characterFromUrl = searchParams.get(
        "character"
      ) as CharacterType | null;
      const characterType = characterFromUrl || "pet-pal-percy";
      const playerName = getPlayerName();

      const engine = new LocalGameEngine(
        playerIdFromUrl,
        characterType,
        playerName
      );
      localEngineRef.current = engine;

      // Set unlock callback
      engine.setOnUnlockCallback((unlockedChar) => {
        const char = getCharacter(unlockedChar);
        toast.success(`🎉 Character Unlocked: ${char.name}!`, {
          description: "Check character selection to play as them!",
          duration: 5000,
        });
      });

      engine.start();
      setGameState(engine.getGameState());
      setIsLoading(false);

      return () => {
        engine.stop();
      };
    } else {
      // Host mode - fetch from server
      const fetchInitialState = async () => {
        try {
          const response = await fetch(`/api/game/${gameId}`);
          if (!response.ok) throw new Error(`Game not found or server error.`);
          const result = (await response.json()) as ApiResponse<GameState>;
          if (result.success && result.data) setGameState(result.data);
          else throw new Error(result.error || "Invalid game state received.");
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "An unknown error occurred.";
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      fetchInitialState();
    }
  }, [
    gameId,
    setGameState,
    localPlayerId,
    navigate,
    isLocalMode,
    searchParams,
  ]);

  useEffect(() => {
    const fetchUpgrades = async () => {
      // Only fetch if player is leveling up, modal is not open, and we haven't already fetched for this level-up
      if (
        isLocalPlayerLevelingUp &&
        !isUpgradeModalOpen &&
        gameId &&
        lastLevelUpPlayerRef.current !== levelingUpPlayerId
      ) {
        lastLevelUpPlayerRef.current = levelingUpPlayerId;

        if (isLocalMode) {
          // Local mode - get upgrades from engine
          const engine = localEngineRef.current;
          if (engine) {
            const upgrades = engine.getUpgradeOptions();
            if (upgrades) {
              openUpgradeModal(upgrades);
            }
          }
        } else {
          // Host mode - fetch from server
          try {
            const res = await fetch(`/api/game/${gameId}/upgrades`);
            if (res.status === 404) {
              console.warn("Upgrades not yet available for this player.");
              return;
            }
            if (!res.ok) throw new Error("Failed to fetch upgrades");
            const result = (await res.json()) as ApiResponse<UpgradeOption[]>;
            if (result.success && result.data) {
              openUpgradeModal(result.data);
            } else {
              console.error(result.error || "Could not load upgrades.");
            }
          } catch (e) {
            console.error("Failed to fetch upgrades", e);
          }
        }
      }

      // Reset tracking when player is no longer leveling up
      if (!isLocalPlayerLevelingUp && lastLevelUpPlayerRef.current !== null) {
        lastLevelUpPlayerRef.current = null;
      }
    };

    fetchUpgrades();
  }, [
    isLocalPlayerLevelingUp,
    levelingUpPlayerId,
    gameId,
    openUpgradeModal,
    isUpgradeModalOpen,
    isLocalMode,
  ]);

  const handleSelectUpgrade = async (upgradeId: string) => {
    if (!gameId || !localPlayerId) return;

    try {
      if (isLocalMode) {
        // Local mode - apply upgrade directly
        const engine = localEngineRef.current;
        if (engine) {
          engine.selectUpgrade(upgradeId);
          setGameState(engine.getGameState());
        }
      } else {
        // Host mode - send to server
        const response = await fetch(`/api/game/${gameId}/upgrade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId: localPlayerId, upgradeId }),
        });

        if (!response.ok) {
          console.error("Failed to submit selected upgrade");
          return;
        }

        const stateResponse = await fetch(`/api/game/${gameId}`);
        if (stateResponse.ok) {
          const stateResult =
            (await stateResponse.json()) as ApiResponse<GameState>;
          if (stateResult.success && stateResult.data) {
            setGameState(stateResult.data);
          }
        }
      }
    } catch (err) {
      console.error("Error confirming upgrade selection", err);
    } finally {
      closeUpgradeModal();
    }
  };

  const handleExtract = () => {
    // Player chose to extract - trigger win condition
    if (isLocalMode && localEngineRef.current) {
      const engine = localEngineRef.current;
      engine.extract();
      setGameState(engine.getGameState());
    }
  };

  const handleContinue = () => {
    // Player chose to continue fighting
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.continueAfterBoss();
      setGameState(localEngineRef.current.getGameState());
    }
  };

  if (isLoading && !activeGameState) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-neon-cyan">
        <Loader2 className="h-16 w-16 animate-spin text-neon-pink" />
        <p className="font-press-start text-2xl mt-4">LOADING ARENA...</p>
      </div>
    );
  }

  const handleCopyError = async () => {
    try {
      const errorDetails = [
        "Glitch Gauntlet Error Report",
        "=".repeat(40),
        `Error: ${error}`,
        `URL: ${window.location.href}`,
        `Game ID: ${gameId}`,
        `Local Mode: ${isLocalMode}`,
        `Player ID: ${localPlayerId || "N/A"}`,
        `User Agent: ${navigator.userAgent}`,
        `Timestamp: ${new Date().toISOString()}`,
      ].join("\n");

      await navigator.clipboard.writeText(errorDetails);
      setErrorCopied(true);
      setTimeout(() => setErrorCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error to clipboard:", err);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-neon-pink p-4">
        <h1 className="font-press-start text-4xl text-neon-pink">ERROR</h1>
        <p className="font-vt323 text-2xl mt-4 text-center max-w-2xl">
          {error}
        </p>
        <Button
          onClick={handleCopyError}
          variant="outline"
          className="mt-6 font-press-start text-sm"
        >
          {errorCopied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Error to Clipboard
            </>
          )}
        </Button>
      </div>
    );
  }

  if (!activeGameState) {
    return null;
  }

  const localPlayer = players.find((p) => p.id === localPlayerId);
  const localPlayerPet =
    activeGameState?.pets?.find((pet) => pet.ownerId === localPlayerId) || null;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <GameCanvas />
      {localPlayer && <StatsPanel player={localPlayer} />}
      {localPlayerPet && (
        <div className="fixed left-4 bottom-[200px] z-30">
          <PetStatsPanel pet={localPlayerPet} />
        </div>
      )}
      <SettingsPanel className="fixed right-4 top-1 z-40" />

      {activeGameState && localPlayer && (
        <UnifiedHUD gameState={activeGameState} localPlayer={localPlayer} />
      )}

      {localPlayer && (
        <CollectedUpgradesPanel
          upgrades={localPlayer.collectedUpgrades || []}
        />
      )}
      <PlayerListPanel players={players} localPlayerId={localPlayerId || ""} />

      {isPaused && !isLocalPlayerLevelingUp && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
          <p className="font-press-start text-3xl text-white">
            Another player is choosing an upgrade...
          </p>
        </div>
      )}

      {isLocalPlayerLevelingUp && (
        <UpgradeModal onSelectUpgrade={handleSelectUpgrade} />
      )}

      {gameStatus === "bossDefeated" && (
        <BossDefeatedModal
          onExtract={handleExtract}
          onContinue={handleContinue}
        />
      )}

      {isTestingArenaOpen && (
        <TestingArenaPanel
          onClose={() => setIsTestingArenaOpen(false)}
          engine={isLocalMode ? localEngineRef.current : null} // Only works in local mode for now
          isSandbox={activeGameState?.isSandboxMode || false}
          isInvulnerable={localPlayer?.isInvulnerable || false}
        />
      )}
    </div>
  );
}
