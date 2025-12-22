import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Toaster, toast } from "@/components/ui/sonner";
import { SettingsPanel } from "@/components/SettingsPanel";
import { CharacterSelect } from "@/components/CharacterSelect";
import { UnlockNotification } from "@/components/UnlockNotification";
import { PlayerNameDialog } from "@/components/PlayerNameDialog";
import { LastRunStatsCard } from "@/components/LastRunStatsCard";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import type { ApiResponse, CharacterType } from "@shared/types";
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

export function HomePage() {
  const navigate = useNavigate();
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterType | null>(null);
  const [unlockedCharacter, setUnlockedCharacter] =
    useState<CharacterType | null>(null);
  const setLocalPlayerId = useGameStore((state) => state.setLocalPlayerId);
  const resetGameState = useGameStore((state) => state.resetGameState);

  useSyncAudioSettings();

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
    setSelectedCharacter(characterType);
    setShowCharacterSelect(false);
    toast.success("Starting local game!");
    navigate(`/game/local?playerId=${playerId}&character=${characterType}`);
  };

  const handleHostGame = async () => {
    setIsHosting(true);
    try {
      const response = await fetch("/api/game/create", { method: "POST" });
      const result = (await response.json()) as ApiResponse<{
        gameId: string;
        playerId: string;
      }>;
      if (result.success && result.data?.gameId && result.data?.playerId) {
        setLocalPlayerId(result.data.playerId);
        toast.success("Game session created!", {
          description: `Joining session: ${result.data.gameId}`,
        });
        navigate(`/game/${result.data.gameId}`);
      } else {
        throw new Error(result.error || "Failed to create game session.");
      }
    } catch (error) {
      console.error("Error hosting game:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Failed to Host Game", {
        description: errorMessage,
      });
      setIsHosting(false);
    }
  };

  const handleJoinGame = async () => {
    if (!joinCode) {
      toast.warning("Please enter a game code.");
      return;
    }
    setIsJoining(true);
    try {
      const response = await fetch(`/api/game/${joinCode}/join`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<{
        playerId: string;
      }>;
      if (result.success && result.data?.playerId) {
        setLocalPlayerId(result.data.playerId);
        toast.success("Joined game successfully!");
        navigate(`/game/${joinCode}`);
      } else {
        throw new Error(result.error || "Failed to join game. Check the code.");
      }
    } catch (error) {
      console.error("Error joining game:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      toast.error("Failed to Join Game", {
        description: errorMessage,
      });
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 overflow-hidden relative text-neon-cyan selection:bg-neon-pink/30">
      <AnimatedBackground />
      <div className="absolute inset-0 bg-black/40 z-[5] pointer-events-none" />

      {/* HUD Frame */}
      <motion.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="w-full h-full absolute inset-0 border-[12px] border-neon-pink/20 shadow-[inset_0_0_100px_rgba(255,0,255,0.1)] z-10 pointer-events-none"
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
            onCancel={() => setShowCharacterSelect(false)}
          />
        )}
      </AnimatePresence>

      {/* Last Run Stats - Left Side */}
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8, type: "spring", bounce: 0.3 }}
        className="fixed left-8 top-1/2 -translate-y-1/2 z-20 w-80 hidden lg:block"
      >
        <LastRunStatsCard />
      </motion.div>

      {/* Leaderboard - Right Side */}
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8, type: "spring", bounce: 0.3 }}
        className="fixed right-8 top-1/2 -translate-y-1/2 z-20 w-96 h-[600px] hidden lg:block"
      >
        <LeaderboardPanel />
      </motion.div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-12">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: "backOut" }}
        >
          <motion.h1
            animate={{
              textShadow: [
                "0 0 10px #FFFF00, 0 0 20px #FFFF00",
                "0 0 20px #FFFF00, 0 0 40px #FFFF00",
                "0 0 10px #FFFF00, 0 0 20px #FFFF00",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="font-press-start text-5xl md:text-7xl text-neon-yellow relative"
          >
            CHILLIN
            <br />
            'n'
            <br />
            KILLIN
            {/* Title Glitch Overlay */}
            <motion.span
              animate={{
                opacity: [0, 0.2, 0, 0.4, 0],
                x: [0, -5, 5, -2, 0],
              }}
              transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
              className="absolute inset-0 text-neon-cyan pointer-events-none"
              style={{ clipPath: "inset(45% 0 45% 0)" }}
            >
              CHILLIN
              <br />
              'n'
              <br />
              KILLIN
            </motion.span>
          </motion.h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex items-center space-x-2"
        >
          <p className="font-press-start text-lg text-neon-pink animate-pulse">
            The game
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
              disabled={isHosting || isJoining}
              className="w-full font-press-start text-lg bg-black/40 backdrop-blur-md border-2 border-neon-yellow text-neon-yellow h-16 hover:bg-neon-yellow hover:text-black hover:shadow-[0_0_30px_rgba(255,255,0,0.5)] transition-all duration-300"
            >
              Play Local
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleHostGame}
              disabled={isHosting || isJoining}
              className="w-full font-press-start text-lg bg-black/40 backdrop-blur-md border-2 border-neon-cyan text-neon-cyan h-16 hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all duration-300"
            >
              {isHosting ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                "Host Game"
              )}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex items-center space-x-4"
          >
            <Input
              type="text"
              placeholder="ENTER GAME CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.trim())}
              disabled={isHosting || isJoining}
              className="font-press-start text-center h-16 text-lg bg-black/60 backdrop-blur-md border-2 border-neon-pink text-neon-pink placeholder:text-neon-pink/30 focus:ring-neon-pink focus:ring-offset-0 transition-all focus:shadow-[0_0_20px_rgba(255,0,255,0.3)]"
            />
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                onClick={handleJoinGame}
                disabled={isHosting || isJoining}
                className="font-press-start text-lg bg-black/40 backdrop-blur-md border-2 border-neon-pink text-neon-pink h-16 hover:bg-neon-pink hover:text-black hover:shadow-[0_0_30px_rgba(255,0,255,0.5)] transition-all duration-300"
              >
                {isJoining ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  "Join"
                )}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-4 text-center text-neon-cyan/50 font-vt323 text-xl z-20"
      >
        <p>Built with ❤️ from Wilsman</p>
      </motion.footer>

      <Toaster richColors theme="dark" />

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed right-4 top-0 z-30"
      >
        <SettingsPanel />
      </motion.div>
    </main>
  );
}
