import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '@/hooks/useGameStore';
import GameCanvas from '@/components/GameCanvas';
import type { ApiResponse, GameState, UpgradeOption, Player, CharacterType } from '@shared/types';
import { Loader2 } from 'lucide-react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useLocalGameLoop } from '@/hooks/useLocalGameLoop';
import { useGameAudio } from '@/hooks/useGameAudio';
import UpgradeModal from '@/components/UpgradeModal';
import { AudioSettingsPanel } from '@/components/AudioSettingsPanel';
import StatsPanel from '@/components/StatsPanel';
import PlayerListPanel from '@/components/PlayerListPanel';
import CollectedUpgradesPanel from '@/components/CollectedUpgradesPanel';
import PetStatsPanel from '@/components/PetStatsPanel';
import { LocalGameEngine } from '@/lib/LocalGameEngine';
import { toast } from '@/components/ui/sonner';
import { getCharacter } from '@shared/characterConfig';
import { submitLeaderboardScore } from '@/lib/leaderboardApi';
import { getPlayerName, getLastRunStats } from '@/lib/progressionStorage';

const EMPTY_PLAYERS: Player[] = [];

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isLocalMode = gameId === 'local';

  const setGameState = useGameStore((state) => state.setGameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const closeUpgradeModal = useGameStore((state) => state.closeUpgradeModal);
  const openUpgradeModal = useGameStore((state) => state.openUpgradeModal);
  const isUpgradeModalOpen = useGameStore((state) => state.isUpgradeModalOpen);
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
  useLocalGameLoop(isLocalMode ? localEngineRef.current : null, isPaused);

  useGameAudio();

  useEffect(() => {
    if (!gameStatus || !gameId) return;

    if (gameStatus === 'gameOver' || gameStatus === 'won') {
      // Submit to leaderboard if in local mode and player has a name
      if (isLocalMode) {
        const playerName = getPlayerName();
        const lastRun = getLastRunStats();
        
        console.log('Game ended with status:', gameStatus);
        console.log('Last run stats:', lastRun);
        
        if (playerName && lastRun) {
          const submission = {
            playerName,
            characterType: lastRun.characterType,
            waveReached: lastRun.waveReached,
            enemiesKilled: lastRun.enemiesKilled,
            survivalTimeMs: lastRun.survivalTimeMs,
            isVictory: lastRun.isVictory,
          };
          console.log('Submitting to leaderboard:', submission);
          
          submitLeaderboardScore(submission).then((result) => {
            console.log('Score submitted to leaderboard:', result);
          }).catch((error) => {
            console.error('Failed to submit score:', error);
          });
        }
      }
      
      // Navigate to appropriate end screen
      if (gameStatus === 'gameOver') {
        navigate(`/gameover/${gameId}`);
      } else {
        navigate(`/gamewon/${gameId}`);
      }
    }
  }, [gameStatus, navigate, gameId, isLocalMode]);

  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided.');
      setIsLoading(false);
      return;
    }

    if (!localPlayerId) {
      navigate('/');
      return;
    }

    if (isLocalMode) {
      // Local mode - create local game engine
      const playerIdFromUrl = searchParams.get('playerId');
      if (!playerIdFromUrl) {
        setError('No player ID provided for local game.');
        setIsLoading(false);
        return;
      }

      const characterFromUrl = searchParams.get('character') as CharacterType | null;
      const characterType = characterFromUrl || 'spray-n-pray';
      
      const engine = new LocalGameEngine(playerIdFromUrl, characterType);
      localEngineRef.current = engine;
      
      // Set unlock callback
      engine.setOnUnlockCallback((unlockedChar) => {
        const char = getCharacter(unlockedChar);
        toast.success(`🎉 Character Unlocked: ${char.name}!`, {
          description: 'Check character selection to play as them!',
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
          else throw new Error(result.error || 'Invalid game state received.');
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      fetchInitialState();
    }
  }, [gameId, setGameState, localPlayerId, navigate, isLocalMode, searchParams]);

  useEffect(() => {
    const fetchUpgrades = async () => {
      // Only fetch if player is leveling up, modal is not open, and we haven't already fetched for this level-up
      if (isLocalPlayerLevelingUp && !isUpgradeModalOpen && gameId && lastLevelUpPlayerRef.current !== levelingUpPlayerId) {
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
              console.warn('Upgrades not yet available for this player.');
              return;
            }
            if (!res.ok) throw new Error('Failed to fetch upgrades');
            const result = (await res.json()) as ApiResponse<UpgradeOption[]>;
            if (result.success && result.data) {
              openUpgradeModal(result.data);
            } else {
              console.error(result.error || 'Could not load upgrades.');
            }
          } catch (e) {
            console.error('Failed to fetch upgrades', e);
          }
        }
      }
      
      // Reset tracking when player is no longer leveling up
      if (!isLocalPlayerLevelingUp && lastLevelUpPlayerRef.current !== null) {
        lastLevelUpPlayerRef.current = null;
      }
    };

    fetchUpgrades();
  }, [isLocalPlayerLevelingUp, levelingUpPlayerId, gameId, openUpgradeModal, isUpgradeModalOpen, isLocalMode]);

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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: localPlayerId, upgradeId }),
        });

        if (!response.ok) {
          console.error('Failed to submit selected upgrade');
          return;
        }

        const stateResponse = await fetch(`/api/game/${gameId}`);
        if (stateResponse.ok) {
          const stateResult = (await stateResponse.json()) as ApiResponse<GameState>;
          if (stateResult.success && stateResult.data) {
            setGameState(stateResult.data);
          }
        }
      }
    } catch (err) {
      console.error('Error confirming upgrade selection', err);
    } finally {
      closeUpgradeModal();
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

  if (error) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-neon-pink p-4">
        <h1 className="font-press-start text-4xl text-neon-pink">ERROR</h1>
        <p className="font-vt323 text-2xl mt-4 text-center">{error}</p>
      </div>
    );
  }

  if (!activeGameState) {
    return null;
  }

  const localPlayer = players.find(p => p.id === localPlayerId);
  const localPlayerPet = activeGameState?.pets?.find(pet => pet.ownerId === localPlayerId) || null;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <GameCanvas />
      {localPlayer && <StatsPanel player={localPlayer} />}
      {localPlayerPet && (
        <div className="fixed left-4 bottom-[200px] z-30">
          <PetStatsPanel pet={localPlayerPet} />
        </div>
      )}
      <AudioSettingsPanel className="fixed right-4 top-4 z-40" />

      <div className="absolute top-4 text-center w-full pointer-events-none">
        <p className="font-press-start text-4xl text-neon-yellow" style={{ textShadow: '0 0 10px #FFFF00' }}>
          WAVE {wave}
        </p>
      </div>

      {localPlayer && <CollectedUpgradesPanel upgrades={localPlayer.collectedUpgrades || []} />}
      <PlayerListPanel players={players} localPlayerId={localPlayerId || ''} />

      {isPaused && !isLocalPlayerLevelingUp && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
          <p className="font-press-start text-3xl text-white">Another player is choosing an upgrade...</p>
        </div>
      )}

      {isLocalPlayerLevelingUp && <UpgradeModal onSelectUpgrade={handleSelectUpgrade} />}
    </div>
  );
}

