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
import type { CharacterType, GameMode } from "@shared/types";
import { GAME_MODES } from "@/lib/gameModes";
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
  const [pendingMode, setPendingMode] = useState<GameMode>("rift");
  // Leaderboard follows the last hovered/focused mode button (default: the Rift, the main mode).
  const [boardMode, setBoardMode] = useState<GameMode>("rift");
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
        // Up/down pick a mode, A starts it.
        if (!showCharacterSelect && !showNameDialog) {
          if (input.up && !lastGamepadInput.current.up) setBoardMode("rift");
          if (input.down && !lastGamepadInput.current.down) setBoardMode("arena");
        }
        if (input.blink && !lastGamepadInput.current.confirm) {
          if (!showCharacterSelect && !showNameDialog) {
            startMode(boardMode);
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
    boardMode,
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

  function startMode(mode: GameMode) {
    if (!hasPlayerName()) {
      setShowNameDialog(true);
      return;
    }
    setAutoplayPending(false);
    setPendingMode(mode);
    setShowCharacterSelect(true);
  }

  const handleAutoplay = () => {
    if (showNameDialog) return;
    setAutoplayPending(true);
    setPendingMode("arena");
    setShowCharacterSelect(true);
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
    if (pendingMode === "rift" && !autoplayPending) {
      toast.success("Entering the Rift");
      navigate(
        `/game/local?playerId=${playerId}&character=${characterType}&explorationPrototype=1`
      );
      return;
    }
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
    toast.success("Entering the Arena");
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
          className="space-y-4 w-full max-w-sm"
        >
          {(["rift", "arena"] as GameMode[]).map((mode) => (
            <ModeButton
              key={mode}
              mode={mode}
              primary={mode === "rift"}
              active={boardMode === mode}
              onFocusMode={() => setBoardMode(mode)}
              onStart={() => startMode(mode)}
            />
          ))}

          <Button
            onClick={handleAutoplay}
            onMouseEnter={() => setBoardMode("arena")}
            onFocus={() => setBoardMode("arena")}
            variant="outline"
            className="w-full font-press-start text-[11px] border-white/20 text-slate-300 h-11 transition hover:border-neon-yellow/60 hover:bg-neon-yellow/5 hover:text-neon-yellow focus-visible:ring-neon-cyan"
          >
            Arena Autoplay
          </Button>

          <p className="font-sans text-sm text-slate-400">Multiplayer — coming soon</p>
        </motion.div>
        <div className="w-full max-w-[420px] text-left"><LastRunStatsCard /></div>
      </div>
      <aside className="mx-auto w-full max-w-[420px]" aria-label="Weekly leaderboards">
        <LeaderboardPanel mode={boardMode} onModeChange={setBoardMode} />
      </aside>
      </div>

      <footer className="relative z-20 mt-4 text-center font-sans text-xs text-slate-400">
        Built with ❤️ from Wilsman
      </footer>
      <Toaster richColors theme="dark" />
      {!showCharacterSelect && (
        <div className="fixed right-5 top-4 z-40"><SettingsPanel /></div>
      )}

    </main>
  );
}

// A game-mode launch button. Hover/focus lifts it, lights the accent glow, unfolds the mode's pitch and
// points the leaderboard at this mode.
function ModeButton({ mode, primary, active, onFocusMode, onStart }: { mode: GameMode; primary: boolean; active: boolean; onFocusMode: () => void; onStart: () => void }) {
  const info = GAME_MODES[mode];
  const [open, setOpen] = useState(false);
  return (
    <motion.button
      type="button"
      data-testid={`mode-${mode}`}
      onClick={onStart}
      onMouseEnter={() => { setOpen(true); onFocusMode(); }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => { setOpen(true); onFocusMode(); }}
      onBlur={() => setOpen(false)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="group relative block w-full overflow-hidden rounded-lg border-2 px-5 py-4 text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-neon-cyan"
      style={{
        borderColor: open || active ? info.accent : `${info.accent}66`,
        backgroundColor: primary ? `${info.accent}${open ? "2e" : "1f"}` : open ? `${info.accent}14` : "rgba(0,0,0,0.55)",
        boxShadow: open ? `0 0 28px ${info.accent}66, inset 0 0 18px ${info.accent}22` : primary ? `0 0 16px ${info.accent}40` : "none",
      }}
    >
      {/* Light sweep on hover */}
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition-all duration-500 group-hover:left-[110%] group-hover:opacity-100 group-focus-visible:left-[110%] group-focus-visible:opacity-100" />
      <span className="flex items-center justify-between gap-3">
        <span className="font-press-start text-base tracking-wide" style={{ color: info.accent, textShadow: `0 0 12px ${info.accent}80` }}>
          {info.name}
        </span>
        <span className="rounded-sm px-1.5 py-1 font-press-start text-[8px] tracking-widest text-black" style={{ backgroundColor: info.accent }}>
          {primary ? "MAIN" : "CLASSIC"}
        </span>
      </span>
      <span className="mt-1.5 block font-press-start text-[8px] tracking-[0.25em] text-slate-400">{info.tag}</span>
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            key="details"
            className="block overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <span className="mt-3 block font-sans text-sm leading-snug text-slate-200">{info.blurb}</span>
            <span className="mt-2 block space-y-1">
              {info.features.map((feature, i) => (
                <motion.span
                  key={feature}
                  className="flex items-center gap-2 font-sans text-xs text-slate-300"
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.06 + i * 0.05 }}
                >
                  <i className="inline-block h-1.5 w-1.5 shrink-0" style={{ backgroundColor: info.accent }} />
                  {feature}
                </motion.span>
              ))}
            </span>
            <span className="mt-3 block font-press-start text-[9px] tracking-widest" style={{ color: info.accent }}>
              &#9654; PRESS TO PLAY
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
