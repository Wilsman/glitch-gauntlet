import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/hooks/useGameStore';
import GameCanvas from '@/components/GameCanvas';
import type { ApiResponse, GameState, UpgradeOption } from '@shared/types';
import { Loader2 } from 'lucide-react';
import { useGameLoop } from '@/hooks/useGameLoop';
import PlayerHUD from '@/components/PlayerHUD';
import UpgradeModal from '@/components/UpgradeModal';
import { useShallow } from 'zustand/react/shallow';
const hudPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { setGameState, localPlayerId, closeUpgradeModal, openUpgradeModal } = useGameStore();
  const { players, levelingUpPlayerId, gameStatus, wave, isUpgradeModalOpen } = useGameStore(
    useShallow((state) => ({
      players: state.gameState?.players || [],
      levelingUpPlayerId: state.gameState?.levelingUpPlayerId,
      gameStatus: state.gameState?.status,
      wave: state.gameState?.wave,
      isUpgradeModalOpen: state.isUpgradeModalOpen,
    }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isPaused = !!levelingUpPlayerId;
  const isLocalPlayerLevelingUp = levelingUpPlayerId === localPlayerId;
  useGameLoop(gameId, isPaused);
  useEffect(() => {
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
      if (isLocalPlayerLevelingUp && !isUpgradeModalOpen) {
        try {
          const res = await fetch(`/api/game/${gameId}/upgrades`);
          if (!res.ok) throw new Error('Failed to fetch upgrades');
          const result = (await res.json()) as ApiResponse<UpgradeOption[]>;
          if (result.success && result.data) {
            openUpgradeModal(result.data);
          } else {
            console.error(result.error || 'Could not load upgrades.');
          }
        } catch (e) {
          console.error("Failed to fetch upgrades", e);
        }
      }
    };
    fetchUpgrades();
  }, [isLocalPlayerLevelingUp, gameId, openUpgradeModal, isUpgradeModalOpen]);
  const handleSelectUpgrade = async (upgradeId: string) => {
    if (!gameId || !localPlayerId) return;
    await fetch(`/api/game/${gameId}/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: localPlayerId, upgradeId }),
    });
    closeUpgradeModal();
  };
  if (isLoading) {
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
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <GameCanvas />
      <div className="absolute top-4 text-center w-full pointer-events-none">
        <p className="font-press-start text-4xl text-neon-yellow" style={{ textShadow: '0 0 10px #FFFF00' }}>
          WAVE {wave}
        </p>
      </div>
      {players.map((p, i) => (
        <PlayerHUD
          key={p.id}
          player={p}
          isLocalPlayer={p.id === localPlayerId}
          position={hudPositions[i % 4]}
        />
      ))}
      {isPaused && !isLocalPlayerLevelingUp && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
            <p className="font-press-start text-3xl text-white">Another player is choosing an upgrade...</p>
        </div>
      )}
      {isLocalPlayerLevelingUp && <UpgradeModal onSelectUpgrade={handleSelectUpgrade} />}
    </div>
  );
}