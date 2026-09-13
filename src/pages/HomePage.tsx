import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/sonner";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CharacterSelect } from "@/components/CharacterSelect";
import { UnlockNotification } from "@/components/UnlockNotification";
import { PlayerNameDialog } from "@/components/PlayerNameDialog";
import { LastRunStatsCard } from "@/components/LastRunStatsCard";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import type { CharacterType } from "@shared/types";
import { useGameStore } from "@/hooks/useGameStore";
import { useSyncAudioSettings } from "@/hooks/useSyncAudioSettings";
import { AudioManager } from "@/lib/audio/AudioManager";
import {
  hasPlayerName,
  setPlayerName,
  getPlayerName,
  checkUnlocks,
} from "@/lib/progressionStorage";
import { AnimatedBackground } from "@/components/AnimatedBackground";

import { useGamepad } from "@/hooks/useGamepad";

export function HomePage() {
  const navigate = useNavigate();
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [autoplayPending, setAutoplayPending] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const setLocalPlayerId = useGameStore((state) => state.setLocalPlayerId);
  const resetGameState = useGameStore((state) => state.resetGameState);
  const [unlockedCharacter, setUnlockedCharacter] =
    useState<CharacterType | null>(null);
  const { getGamepadInput } = useGamepad();
  const lastGamepadInput = useRef<{
    up: boolean;
    down: boolean;
    confirm: boolean;
  }>({
    up: false,
    down: false,
    confirm: false,
  });

  useSyncAudioSettings();

  useEffect(() => {
    const pollInterval = setInterval(() => {
      const input = getGamepadInput();
      if (input) {
        // Handle Confirm (A button)
        if (input.blink && !lastGamepadInput.current.confirm) {
          if (!showCharacterSelect && !showNameDialog) {
            handleLocalGame();
          }
          lastGamepadInput.current.confirm = true;
        } else if (!input.blink) {
          lastGamepadInput.current.confirm = false;
        }

        lastGamepadInput.current.up = !!input.up;
        lastGamepadInput.current.down = !!input.down;
      }
    }, 100);


    return () => {
      clearInterval(pollInterval);
    };
  }, [
    getGamepadInput,
    showCharacterSelect,
    showNameDialog,
  ]);

  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      toast.info(`Controller Detected: ${e.gamepad.id}`, {
        description:
          "You can now use your controller to play and navigate menus.",
      });
    };
    window.addEventListener("gamepadconnected", handleConnected);

    // Check if one is already connected
    const pads = navigator.getGamepads();
    if (Array.from(pads).some((p) => p !== null)) {
      const p = Array.from(pads).find((p) => p !== null);
      if (p) {
        toast.info(`Controller Connected: ${p.id}`);
      }
    }

    return () =>
      window.removeEventListener("gamepadconnected", handleConnected);
  }, []);

  useEffect(() => {
    resetGameState();
    // Check for unlocks when returning to home page
    checkUnlocks();
    // Check if player needs to set their name
    if (!hasPlayerName()) {
      setShowNameDialog(true);
    }
  }, [resetGameState]);

  useEffect(() => {
    const audio = AudioManager.getInstance();
    void audio.resume();
    audio.playMenuMusic();
    return () => {
      audio.stopMenuMusic();
    };
  }, []);

  const handleLocalGame = () => {
    if (!hasPlayerName()) {
      setShowNameDialog(true);
      return;
    }
    setAutoplayPending(false);
    setShowCharacterSelect(true);
  };

  const handleAutoplay = () => {
    if (showNameDialog) return;
    setAutoplayPending(true);
    setShowCharacterSelect(true);
  };

  const handlePrototype = () => {
    if (showNameDialog) return;
    const playerId = `local-${Date.now()}`;
    setLocalPlayerId(playerId);
    toast.success("Entering the Playground", {
      description: "Unstable beta build — expect weirdness.",
    });
    navigate(
      `/game/local?playerId=${playerId}&character=dash-dynamo&explorationPrototype=1`
    );
  };

  const handleNameSubmit = (name: string) => {
    setPlayerName(name);
    setShowNameDialog(false);
    toast.success(`Welcome, ${name}!`, {
      description: "Your name has been saved for the leaderboard.",
    });
  };

  const handleCharacterSelected = (characterType: CharacterType) => {
    const playerId = `local-${Date.now()}`;
    setLocalPlayerId(playerId);
    setShowCharacterSelect(false);
    if (autoplayPending) {
      setAutoplayPending(false);
      toast.success("Autoplay started", {
        description: "Score and unlocks are disabled for autoplay runs.",
      });
      navigate(
        `/game/local?playerId=${playerId}&character=${characterType}&autoplay=1`
      );
      return;
    }
    toast.success("Starting local game!");
    navigate(`/game/local?playerId=${playerId}&character=${characterType}`);
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center px-5 pb-6 pt-20 overflow-x-hidden relative text-slate-100 selection:bg-neon-pink/30">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/40 z-[5] pointer-events-none" />

      {/* HUD Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="w-full h-full absolute inset-0 border border-neon-pink/10 z-10 pointer-events-none"
      />

      {/* Player Name Dialog */}
      <PlayerNameDialog
        open={showNameDialog}
        onNameSubmit={handleNameSubmit}
        initialName={getPlayerName() || ""}
      />

      {/* Unlock Notification */}
      <AnimatePresence>
        {unlockedCharacter && (
          <UnlockNotification
            characterType={unlockedCharacter}
            onClose={() => setUnlockedCharacter(null)}
          />
        )}
      </AnimatePresence>

      {/* Character Selection Modal */}
      <AnimatePresence>
        {showCharacterSelect && (
          <CharacterSelect
            onSelect={handleCharacterSelected}
            onCancel={() => {
              setShowCharacterSelect(false);
              setAutoplayPending(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className={`relative z-20 mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-20 ${showCharacterSelect || showNameDialog ? 'invisible' : ''}`}>
      <div className="flex min-w-0 flex-col items-center justify-center text-center space-y-8">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "backOut" }}
        >
          <motion.h1
            style={{ textShadow: '0 0 24px rgba(255,255,0,0.2)' }}
            className="font-press-start text-[clamp(2rem,4.5vw,4rem)] leading-[1.35] text-neon-yellow relative"
          >
            CHILLIN
            <span className="block py-1 text-[0.5em] leading-normal text-yellow-100">'n'</span>
            KILLIN

          </motion.h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex items-center space-x-2"
        >
          <p className="max-w-sm font-sans text-base leading-relaxed text-slate-300">
            Pick your character. Build your loadout. Survive the gauntlet.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="space-y-6 w-full max-w-sm"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleLocalGame}
              className="w-full font-press-start text-sm bg-neon-yellow border border-neon-yellow text-black h-14 shadow-glow-yellow transition hover:bg-yellow-200 focus-visible:ring-neon-cyan"
            >
              Play Local
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleAutoplay}
              variant="outline"
              className="w-full font-press-start text-sm border-neon-cyan text-neon-cyan h-14 transition hover:bg-neon-cyan/10 hover:text-neon-cyan focus-visible:ring-neon-cyan"
            >
              Autoplay
            </Button>
          </motion.div>

          <p className="font-sans text-sm text-slate-400">Multiplayer — coming soon</p>
        </motion.div>
        <div className="w-full max-w-[420px] text-left"><LastRunStatsCard /></div>
      </div>
      <aside className="mx-auto w-full max-w-[420px]" aria-label="Weekly leaderboards">
        <LeaderboardPanel />
      </aside>
      </div>

      <footer className="relative z-20 mt-4 text-center font-sans text-xs text-slate-400">
        Built with ❤️ from Wilsman
      </footer>
      <Toaster richColors theme="dark" />
      {!showCharacterSelect && (
        <div className="fixed right-5 top-4 z-40"><SettingsPanel /></div>
      )}

      {/* Beta playtest access */}
      {!showCharacterSelect && (
        <motion.div
          initial={{ opacity: 0, y: 20, rotate: -4 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 1.6, duration: 0.6, type: "spring" }}
          whileHover={{ rotate: 0, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-5 left-5 z-40"
        >
          <button
            onClick={handlePrototype}
            className="group relative block w-48 sm:w-56 overflow-hidden rounded-md border-2 border-dashed border-neon-pink/60 bg-black/80 text-left shadow-glow-pink backdrop-blur-sm transition-colors hover:border-neon-pink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-pink"
          >
            <div className="h-2 w-full bg-[repeating-linear-gradient(45deg,#FFFF00_0_10px,#000_10px_20px)]" />
            <div className="space-y-1.5 p-3">
              <div className="flex items-center justify-between">
                <span className="font-press-start text-[8px] tracking-wider text-neon-pink">
                  BETA PLAYTEST
                </span>
                <span className="flex items-center gap-1 font-vt323 text-sm leading-none text-red-500">
                  <span className="inline-block h-1.5 w-1.5 animate-ping rounded-full bg-red-500" />
                  REC
                </span>
              </div>
              <p className="font-press-start text-xs text-neon-yellow group-hover:animate-glitch">
                THE PLAYGROUND
              </p>
              <p className="font-vt323 text-sm leading-tight text-slate-400">
                open map proto v0.1 — unstable, probably haunted
              </p>
            </div>
            <span className="absolute -right-1 top-6 rotate-12 rounded-sm border border-neon-cyan/70 bg-black/60 px-1.5 py-0.5 font-press-start text-[7px] text-neon-cyan/80">
              WIP
            </span>
          </button>
        </motion.div>
      )}
    </main>
  );
}
