import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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
import BossDefeatedModal from "@/components/BossDefeatedModal";
import UnifiedHUD from "@/components/UnifiedHUD";
import { LocalGameEngine } from "@/lib/LocalGameEngine";
import TestingArenaPanel from "@/components/TestingArenaPanel";
import { toast } from "@/components/ui/sonner";
import { CHARACTERS, getCharacter } from "@shared/characterConfig";
import { submitLeaderboardScore } from "@/lib/leaderboardApi";
import { getPlayerName, getLastRunStats } from "@/lib/progressionStorage";
import RunMapOverlay from "@/components/RunMapOverlay";
import { DIFFICULTY_TIERS } from "@/lib/explorationWorld";
import { PauseMenuOverlay } from "@/components/PauseMenuOverlay";

const EMPTY_PLAYERS: Player[] = [];

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isLocalMode = gameId === "local";
  const isExplorationPrototype = isLocalMode && searchParams.get("explorationPrototype") === "1";
  const isAutoplay = isLocalMode && searchParams.get("autoplay") === "1";

  const setGameState = useGameStore((state) => state.setGameState);
  const storeLocalPlayerId = useGameStore((state) => state.localPlayerId);
  const setLocalPlayerId = useGameStore((state) => state.setLocalPlayerId);
  const closeUpgradeModal = useGameStore((state) => state.closeUpgradeModal);
  const openUpgradeModal = useGameStore((state) => state.openUpgradeModal);
  const isUpgradeModalOpen = useGameStore((state) => state.isUpgradeModalOpen);
  const [isTestingArenaOpen, setIsTestingArenaOpen] = useState(false);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);
  const [localRunNonce, setLocalRunNonce] = useState(0);
  const rawGameState = useGameStore((state) => state.gameState);
  const urlPlayerId = isLocalMode ? searchParams.get("playerId") : null;
  const localPlayerId = storeLocalPlayerId || urlPlayerId;

  const activeGameState = useMemo(() => {
    if (!rawGameState || !gameId) return null;
    // For local mode, always use the game state since gameId is always 'local'
    if (isLocalMode) return rawGameState;
    return rawGameState.gameId === gameId ? rawGameState : null;
  }, [rawGameState, gameId, isLocalMode]);

  const players = activeGameState?.players ?? EMPTY_PLAYERS;
  const levelingUpPlayerId = activeGameState?.levelingUpPlayerId ?? null;
  // Serial distinguishes back-to-back prompts for the same player (e.g. surplus XP).
  const upgradePromptKey = levelingUpPlayerId ? `${levelingUpPlayerId}:${activeGameState?.upgradePromptSerial ?? 0}` : null;
  const upgradePromptType = activeGameState?.upgradePromptType ?? null;
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
  const shouldPauseGameplay =
    isPaused || isTestingArenaOpen || isPauseMenuOpen;

  // Use appropriate game loop based on mode
  useGameLoop(isLocalMode ? undefined : gameId, isPaused);
  useLocalGameLoop(
    isLocalMode ? localEngineRef.current : null,
    shouldPauseGameplay
  );

  useGameAudio();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExplorationPrototype && e.key.toLowerCase() === 'f' && !(e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName))) {
        e.preventDefault();
        const action = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        void action.catch(() => toast.error('Fullscreen is unavailable in this browser.'));
        return;
      }
      if (e.key === "Escape" && isLocalMode) {
        if (
          isUpgradeModalOpen ||
          gameStatus === "bossDefeated" ||
          gameStatus === "gameOver" ||
          gameStatus === "won"
        ) {
          return;
        }
        if (isTestingArenaOpen) {
          setIsTestingArenaOpen(false);
          return;
        }
        e.preventDefault();
        setIsPauseMenuOpen((prev) => !prev);
        return;
      }

      if (e.key === "\\") {
        if (isLocalMode) {
          setIsPauseMenuOpen(false);
          setIsTestingArenaOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    gameStatus,
    isLocalMode,
    isPauseMenuOpen,
    isTestingArenaOpen,
    isUpgradeModalOpen,
    isExplorationPrototype,
  ]);

  // Sync engine pause state with overlay visibility
  useEffect(() => {
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.setIsPaused(shouldPauseGameplay);
    }
  }, [isLocalMode, shouldPauseGameplay]);

  useEffect(() => {
    if (!gameStatus || !gameId) return;

    if (isExplorationPrototype) return;
    if (gameStatus === "gameOver" || gameStatus === "won") {
      // Submit to leaderboard if in local mode and player has a name
      // Autoplay runs never submit scores
      if (isLocalMode && !isAutoplay && !isExplorationPrototype) {
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
      const autoplaySuffix = isAutoplay ? "?autoplay=1" : "";
      if (gameStatus === "gameOver") {
        navigate(`/gameover/${gameId}${autoplaySuffix}`);
      } else {
        navigate(`/gamewon/${gameId}${autoplaySuffix}`);
      }
    }
  }, [gameStatus, navigate, gameId, isLocalMode, isAutoplay, isExplorationPrototype]);

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
      if (!storeLocalPlayerId) {
        setLocalPlayerId(playerIdFromUrl);
      }

      const characterFromUrl = searchParams.get(
        "character"
      ) as CharacterType | null;
      const characterType = isExplorationPrototype
        ? (characterFromUrl && characterFromUrl in CHARACTERS ? characterFromUrl : "dash-dynamo")
        : characterFromUrl || "pet-pal-percy";
      const playerName = getPlayerName();

      const engine = new LocalGameEngine(
        playerIdFromUrl,
        characterType,
        playerName
      );
      if (isExplorationPrototype) engine.configureExploration(Number(searchParams.get("seed") || 0));
      engine.setAutoplay(isAutoplay && !isExplorationPrototype);
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
      setGameState(engine.getGameState(), true);
      setIsLoading(false);
      setIsPauseMenuOpen(false);
      setIsTestingArenaOpen(false);

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
    storeLocalPlayerId,
    setLocalPlayerId,
    navigate,
    isLocalMode,
    isAutoplay,
    searchParams,
    isExplorationPrototype,
    localRunNonce,
  ]);

  useEffect(() => {
    const fetchUpgrades = async () => {
      // Only fetch if player is leveling up, modal is not open, and we haven't already fetched for this level-up
      if (
        isLocalPlayerLevelingUp &&
        !isUpgradeModalOpen &&
        !isAutoplay &&
        gameId &&
        lastLevelUpPlayerRef.current !== upgradePromptKey
      ) {
        lastLevelUpPlayerRef.current = upgradePromptKey;

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
    upgradePromptKey,
    gameId,
    openUpgradeModal,
    isUpgradeModalOpen,
    isLocalMode,
    isAutoplay,
  ]);

  useEffect(() => {
    if (!isLocalMode) return;

    (window as typeof window & {
      advanceTime?: (ms: number) => Promise<void>;
      render_game_to_text?: () => string;
    }).advanceTime = async (ms: number) => {
      if (!localEngineRef.current) return;
      localEngineRef.current.advanceTime(ms);
      setGameState(localEngineRef.current.getGameState(), true);
    };

    (window as typeof window & {
      advanceTime?: (ms: number) => Promise<void>;
      render_game_to_text?: () => string;
    }).render_game_to_text = () => {
      if (!localEngineRef.current) return JSON.stringify({ mode: "loading" });
      return localEngineRef.current.renderGameToText();
    };
    // Dev-only handle so browser verification scripts can stage open-map scenarios.
    if (import.meta.env.DEV) (window as typeof window & { __localEngine?: () => unknown }).__localEngine = () => localEngineRef.current;

    return () => {
      delete (window as typeof window & {
        advanceTime?: (ms: number) => Promise<void>;
        render_game_to_text?: () => string;
      }).advanceTime;
      delete (window as typeof window & {
        advanceTime?: (ms: number) => Promise<void>;
        render_game_to_text?: () => string;
      }).render_game_to_text;
    };
  }, [isLocalMode, setGameState]);

  const handleSelectUpgrade = async (upgradeId: string) => {
    if (!gameId || !localPlayerId) return;

    try {
      if (isLocalMode) {
        // Local mode - apply upgrade directly
        const engine = localEngineRef.current;
          if (engine) {
            engine.selectUpgrade(upgradeId);
            setGameState(engine.getGameState(), true);
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
      setGameState(engine.getGameState(), true);
    }
  };

  const handleContinue = () => {
    // Player chose to continue fighting
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.continueAfterBoss();
      setGameState(localEngineRef.current.getGameState(), true);
    }
  };

  const handleSelectMapNode = (nodeId: string) => {
    if (isLocalMode && localEngineRef.current) {
      localEngineRef.current.selectMapNode(nodeId);
      setGameState(localEngineRef.current.getGameState(), true);
    }
  };

  const handleRestartRun = () => {
    if (!isLocalMode || !localEngineRef.current) return;
    setIsPauseMenuOpen(false);
    localEngineRef.current.stop();
    localEngineRef.current = null;
    setLocalRunNonce((value) => value + 1);
    setIsLoading(true);
  };

  const handleExitToMenu = () => {
    setIsPauseMenuOpen(false);
    navigate("/");
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
      {isExplorationPrototype && <div className="fixed bottom-1 left-1/2 z-30 -translate-x-1/2 text-[9px] text-slate-500">EXPLORATION PROTOTYPE · no saved progression · testing controls: backslash</div>}
      {isExplorationPrototype && (gameStatus === 'gameOver' || gameStatus === 'won') && <PrototypeRunSummary gameState={activeGameState} player={localPlayer} onRestart={handleRestartRun} onMenu={handleExitToMenu} />}
      {localPlayer && <StatsPanel player={localPlayer} />}
      {isLocalMode && (
        <PauseMenuOverlay
          open={isPauseMenuOpen}
          onResume={() => setIsPauseMenuOpen(false)}
          onRestartRun={handleRestartRun}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {activeGameState && localPlayer && (
        <UnifiedHUD
          gameState={activeGameState}
          localPlayer={localPlayer}
          localPlayerPet={localPlayerPet}
        />
      )}
      <SettingsPanel className="fixed right-4 top-0 z-50" />

      <AnimatePresence mode="wait">
        {isLocalMode &&
          !isExplorationPrototype &&
          activeGameState?.status === "mapSelection" &&
          activeGameState.runMap && (
            <RunMapOverlay
              key={`run-map-${activeGameState.mapDepth || 0}-${activeGameState.runMap.currentNodeId || "root"}`}
              runMap={activeGameState.runMap}
              currentDepth={activeGameState.mapDepth || 0}
              threatTier={activeGameState.wave || 0}
              onSelectNode={handleSelectMapNode}
              localPlayerName={localPlayer?.name || null}
              localPlayerCoins={localPlayer?.coins || 0}
              localPlayerCharacterType={localPlayer?.characterType || null}
            />
          )}
      </AnimatePresence>

      <PlayerListPanel players={players} localPlayerId={localPlayerId || ""} />

      {isPaused && !isLocalPlayerLevelingUp && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
          <p className="font-press-start text-3xl text-white">
            {upgradePromptType === "shop"
              ? "Another player is shopping..."
              : "Another player is choosing an upgrade..."}
          </p>
        </div>
      )}

      {isLocalPlayerLevelingUp && !isAutoplay && (
        <UpgradeModal onSelectUpgrade={handleSelectUpgrade} />
      )}

      {gameStatus === "bossDefeated" && !isAutoplay && (
        <BossDefeatedModal
          onExtract={handleExtract}
          onContinue={handleContinue}
        />
      )}

      {isAutoplay && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 font-press-start text-xs text-neon-cyan bg-black/70 border border-neon-cyan/60 px-4 py-2 rounded pointer-events-none">
          AUTOPLAY — score &amp; unlocks disabled
        </div>
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

const SUMMARY_RARITY_COLORS: Record<string, string> = { common: '#e2e8f0', uncommon: '#4ade80', legendary: '#f87171', boss: '#facc15', lunar: '#60a5fa', void: '#c084fc' };

function PrototypeRunSummary({ gameState, player, onRestart, onMenu }: { gameState: GameState; player: Player | undefined; onRestart: () => void; onMenu: () => void }) {
  const run = gameState.exploration?.run;
  const seconds = Math.floor((gameState.exploration?.elapsedMs || 0) / 1000);
  const tier = DIFFICULTY_TIERS[Math.min(run?.maxTier ?? 0, DIFFICULTY_TIERS.length - 1)];
  const rows: [string, string][] = [
    ['STAGES CLEARED', String(run?.stagesCleared ?? 0)],
    ['TOTAL TIME', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`],
    ['TOTAL KILLS', String(run?.totalKills ?? 0)],
    ['BEST COMBO', `x${run?.bestCombo ?? 0}`],
    ['PEAK THREAT', tier?.label || 'EASY'],
    ['LEVEL', String(player?.level ?? 1)],
  ];
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" data-testid="prototype-run-summary">
    <div className="w-[min(560px,94vw)] rounded-lg border-4 border-cyan-400 bg-[#0a0f1e] p-6 text-white shadow-[0_0_80px_rgba(34,211,238,0.25)]">
      <div className="font-press-start text-center text-[10px] tracking-[0.5em] text-slate-400">GLITCH LOOP</div>
      <h2 className="mt-2 text-center font-press-start text-3xl text-cyan-300" style={{ textShadow: '3px 3px 0 #020617, 0 0 30px #22d3ee' }}>RUN SUMMARY</h2>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 font-vt323 text-lg text-slate-300">
        {rows.map(([label, value]) => <React.Fragment key={label}><span className="text-slate-500">{label}</span><span className="text-right text-white">{value}</span></React.Fragment>)}
      </div>
      <div className="mt-5 border-t border-white/10 pt-3">
        <div className="font-press-start text-[9px] tracking-widest text-slate-500">ITEMS COLLECTED · {run?.items.length ?? 0}</div>
        <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
          {(run?.items || []).map((item, i) => <span key={i} title={item.title} className="flex h-9 w-9 items-center justify-center rounded border-2 text-lg" style={{ borderColor: SUMMARY_RARITY_COLORS[item.rarity] || '#64748b', backgroundColor: `${SUMMARY_RARITY_COLORS[item.rarity] || '#64748b'}18` }}>{item.emoji}</span>)}
          {!run?.items.length && <span className="text-sm text-slate-500">No relics claimed.</span>}
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <Button onClick={onRestart} className="font-press-start text-[10px]">RUN IT BACK</Button>
        <Button onClick={onMenu} variant="outline" className="font-press-start text-[10px]">MENU</Button>
      </div>
      <div className="mt-3 text-center text-[10px] text-slate-600">Prototype · your normal run history is unchanged.</div>
    </div>
  </div>;
}
