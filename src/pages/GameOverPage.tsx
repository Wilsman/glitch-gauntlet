import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSyncAudioSettings } from '@/hooks/useSyncAudioSettings';
import { AudioManager } from '@/lib/audio/AudioManager';
import { Button } from '@/components/ui/button';
import { AudioSettingsPanel } from '@/components/AudioSettingsPanel';
import { Loader2 } from 'lucide-react';
import type { ApiResponse, GameState } from '@shared/types';
import { motion } from 'framer-motion';
export default function GameOverPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useSyncAudioSettings();
  useEffect(() => {
    const audio = AudioManager.getInstance();
    void audio.resume();
    audio.stopGameMusic();
    audio.playMenuMusic();
    return () => {
      audio.stopMenuMusic();
    };
  }, []);

  useEffect(() => {
    const fetchGameState = async () => {
      if (!gameId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/game/${gameId}`);
        const result = (await response.json()) as ApiResponse<GameState>;
        if (result.success && result.data) {
          setGameState(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGameState();
  }, [gameId]);
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative text-neon-cyan">
      <div className="absolute inset-0 bg-black opacity-80 z-0" />
      <div className="w-full h-full absolute inset-0 border-4 border-neon-pink shadow-glow-pink z-10 pointer-events-none" />
      <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-12">
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="font-press-start text-6xl md:text-8xl text-red-500 animate-glitch"
          style={{ textShadow: '0 0 10px #ff0000, 0 0 20px #ff0000' }}
        >
          GAME OVER
        </motion.h1>
        {loading ? (
          <Loader2 className="h-12 w-12 animate-spin text-neon-cyan" />
        ) : (
          gameState && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="font-vt323 text-3xl text-white space-y-4"
            >
              <p>
                YOU SURVIVED UNTIL WAVE:{' '}
                <span className="font-press-start text-4xl text-neon-yellow">{gameState.wave}</span>
              </p>
              <div className="pt-4">
                <h2 className="font-press-start text-2xl text-neon-pink mb-2">FINAL STATS</h2>
                <ul className="text-2xl">
                  {gameState.players.map((player, index) => (
                     <motion.li
                        key={player.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                     >
                      <span style={{ color: player.color }}>P{player.id.substring(0, 2).toUpperCase()}</span> - LVL{' '}
                      {player.level}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )
        )}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Link to="/">
            <Button className="w-64 font-press-start text-lg bg-transparent border-2 border-neon-cyan text-neon-cyan h-16 hover:bg-neon-cyan hover:text-black hover:shadow-glow-cyan transition-all duration-300">
              MAIN MENU
            </Button>
          </Link>
        </motion.div>
      </div>
      <AudioSettingsPanel className="absolute right-4 top-4 z-30" />
      <footer className="absolute bottom-4 text-center text-neon-cyan/50 font-vt323 text-xl z-20">
        <p>Built with ❤️ at Cloudflare</p>
      </footer>
    </main>
  );
}

