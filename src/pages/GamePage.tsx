import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/hooks/useGameStore';
import GameCanvas from '@/components/GameCanvas';
import type { ApiResponse, GameState, UpgradeOption, Player } from '@shared/types';
import { Loader2 } from 'lucide-react';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useGameAudio } from '@/hooks/useGameAudio';
import UpgradeModal from '@/components/UpgradeModal';
import { AudioSettingsPanel } from '@/components/AudioSettingsPanel';
import StatsPanel from '@/components/StatsPanel';
import PlayerListPanel from '@/components/PlayerListPanel';
import CollectedUpgradesPanel from '@/components/CollectedUpgradesPanel';

const EMPTY_PLAYERS: Player[] = [];

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const setGameState = useGameStore((state) => state.setGameState);
  const localPlayerId = useGameStore((state) => state.localPlayerId);
  const closeUpgradeModal = useGameStore((state) => state.closeUpgradeModal);
  const openUpgradeModal = useGameStore((state) => state.openUpgradeModal);
  const isUpgradeModalOpen = useGameStore((state) => state.isUpgradeModalOpen);
  const rawGameState = useGameStore((state) => state.gameState);

  const activeGameState = useMemo(() => {
    if (!rawGameState || !gameId) return null;
    return rawGameState.gameId === gameId ? rawGameState : null;
  }, [rawGameState, gameId]);

  const players = activeGameState?.players ?? EMPTY_PLAYERS;
  const levelingUpPlayerId = activeGameState?.levelingUpPlayerId ?? null;
  const gameStatus = activeGameState?.status ?? null;
  const wave = activeGameState?.wave ?? 0;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
  }, [gameId]);

  const isPaused = !!levelingUpPlayerId;
  const isLocalPlayerLevelingUp = levelingUpPlayerId === localPlayerId;

  useGameLoop(gameId, isPaused);

  useGameAudio();

  useEffect(() => {
    if (!gameStatus || !gameId) return;

    if (gameStatus === 'gameOver') {
      navigate(`/gameover/${gameId}`);
    } else if (gameStatus === 'won') {
      navigate(`/gamewon/${gameId}`);
    }
  }, [gameStatus, navigate, gameId]);

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
  }, [gameId, setGameState, localPlayerId, navigate]);

  useEffect(() => {
    const fetchUpgrades = async () => {
      if (isLocalPlayerLevelingUp && !isUpgradeModalOpen && gameId) {
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
    };

    fetchUpgrades();
  }, [isLocalPlayerLevelingUp, gameId, openUpgradeModal, isUpgradeModalOpen]);

  const handleSelectUpgrade = async (upgradeId: string) => {
    if (!gameId || !localPlayerId) return;

    try {
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

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <div className="flex items-center gap-4">
        <GameCanvas />
        {localPlayer && <StatsPanel player={localPlayer} />}
      </div>
      <AudioSettingsPanel className="absolute right-4 top-4 z-40" />

      <div className="absolute top-4 text-center w-full pointer-events-none">
        <p className="font-press-start text-4xl text-neon-yellow" style={{ textShadow: '0 0 10px #FFFF00' }}>
          WAVE {wave}
        </p>
      </div>

      <PlayerListPanel players={players} localPlayerId={localPlayerId || ''} />
      {localPlayer && <CollectedUpgradesPanel upgrades={localPlayer.collectedUpgrades || []} />}

      {isPaused && !isLocalPlayerLevelingUp && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
          <p className="font-press-start text-3xl text-white">Another player is choosing an upgrade...</p>
        </div>
      )}

      {isLocalPlayerLevelingUp && <UpgradeModal onSelectUpgrade={handleSelectUpgrade} />}
    </div>
  );
}

