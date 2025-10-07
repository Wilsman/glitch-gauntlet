import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { hasPlayerName, setPlayerName, getPlayerName, checkUnlocks } from "@/lib/progressionStorage";

export function HomePage() {
  const navigate = useNavigate();
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterType | null>(null);
  const [unlockedCharacter, setUnlockedCharacter] = useState<CharacterType | null>(null);
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
    <main className="min-h-screen w-full flex items-center justify-center p-4 overflow-hidden relative text-neon-cyan">
      <div className="absolute inset-0 bg-black opacity-80 z-0" />
      <div className="w-full h-full absolute inset-0 border-4 border-neon-pink shadow-glow-pink z-10 pointer-events-none" />
      
      {/* Player Name Dialog */}
      <PlayerNameDialog
        open={showNameDialog}
        onNameSubmit={handleNameSubmit}
        initialName={getPlayerName() || ''}
      />

      {/* Unlock Notification */}
      {unlockedCharacter && (
        <UnlockNotification
          characterType={unlockedCharacter}
          onClose={() => setUnlockedCharacter(null)}
        />
      )}

      {/* Character Selection Modal */}
      {showCharacterSelect && (
        <CharacterSelect
          onSelect={handleCharacterSelected}
          onCancel={() => setShowCharacterSelect(false)}
        />
      )}
      
      {/* Last Run Stats - Left Side */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 z-20 w-80 hidden lg:block">
        <LastRunStatsCard />
      </div>

      {/* Leaderboard - Right Side */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 w-96 h-[600px] hidden lg:block">
        <LeaderboardPanel />
      </div>

      <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-12">
        <h1
          className="font-press-start text-5xl md:text-7xl text-neon-yellow"
          style={{ textShadow: "0 0 10px #FFFF00, 0 0 20px #FFFF00" }}
        >
          CHILLIN
          <br />
          'n'
          <br />
          KILLIN
        </h1>
        {/* // "the game in small" */}
        <div className="flex items-center space-x-2">
          <p className="font-press-start text-lg text-neon-pink">The game</p>
        </div>
        <div className="space-y-6 w-full max-w-sm">
          <Button
            onClick={handleLocalGame}
            disabled={isHosting || isJoining}
            className="w-full font-press-start text-lg bg-transparent border-2 border-neon-yellow text-neon-yellow h-16 hover:bg-neon-yellow hover:text-black hover:shadow-glow-yellow transition-all duration-300"
          >
            Play Local
          </Button>
          <Button
            onClick={handleHostGame}
            disabled={isHosting || isJoining}
            className="w-full font-press-start text-lg bg-transparent border-2 border-neon-cyan text-neon-cyan h-16 hover:bg-neon-cyan hover:text-black hover:shadow-glow-cyan transition-all duration-300"
          >
            {isHosting ? (
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            ) : (
              "Host Game"
            )}
          </Button>
          <div className="flex items-center space-x-4">
            <Input
              type="text"
              placeholder="ENTER GAME CODE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.trim())}
              disabled={isHosting || isJoining}
              className="font-press-start text-center h-16 text-lg bg-black border-2 border-neon-pink text-neon-pink placeholder:text-neon-pink/50 focus:ring-neon-pink focus:ring-offset-0"
            />
            <Button
              onClick={handleJoinGame}
              disabled={isHosting || isJoining}
              className="font-press-start text-lg bg-transparent border-2 border-neon-pink text-neon-pink h-16 hover:bg-neon-pink hover:text-black hover:shadow-glow-pink transition-all duration-300"
            >
              {isJoining ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Join"
              )}
            </Button>
          </div>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-neon-cyan/50 font-vt323 text-xl z-20">
        <p>Built with ❤️ from Wilsman</p>
      </footer>
      <Toaster richColors theme="dark" />
      <SettingsPanel className="absolute right-4 top-1 z-30" />
    </main>
  );
}
