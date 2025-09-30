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
              <div className="pt-8 space-y-8">
                <h2 className="font-press-start text-2xl text-neon-pink mb-4">FINAL STATS</h2>
                {gameState.players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.15 }}
                    className="bg-black/60 border-2 p-6 rounded-lg"
                    style={{ borderColor: player.color }}
                  >
                    <h3 className="font-press-start text-2xl mb-4" style={{ color: player.color }}>
                      PLAYER {player.id.substring(0, 2).toUpperCase()}
                    </h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left text-xl">
                      <div><span className="text-neon-cyan">Level:</span> <span className="text-white">{player.level}</span></div>
                      <div><span className="text-neon-cyan">XP:</span> <span className="text-white">{player.xp}</span></div>
                      <div><span className="text-neon-cyan">Health:</span> <span className="text-white">{player.health}/{player.maxHealth}</span></div>
                      <div><span className="text-neon-cyan">Speed:</span> <span className="text-white">{player.speed.toFixed(1)}</span></div>
                      <div><span className="text-neon-cyan">Damage:</span> <span className="text-white">{player.projectileDamage}</span></div>
                      <div><span className="text-neon-cyan">Attack Speed:</span> <span className="text-white">{(1000 / player.attackSpeed).toFixed(1)}/s</span></div>
                      <div><span className="text-neon-cyan">Multishot:</span> <span className="text-white">x{player.projectilesPerShot}</span></div>
                      <div><span className="text-neon-cyan">Crit Chance:</span> <span className="text-white">{(player.critChance * 100).toFixed(0)}%</span></div>
                      <div><span className="text-neon-cyan">Crit Damage:</span> <span className="text-white">{player.critMultiplier.toFixed(1)}x</span></div>
                      <div><span className="text-neon-cyan">Life Steal:</span> <span className="text-white">{(player.lifeSteal * 100).toFixed(0)}%</span></div>
                      <div><span className="text-neon-cyan">Pickup Radius:</span> <span className="text-white">{player.pickupRadius}</span></div>
                      {player.armor && player.armor > 0 && (
                        <div><span className="text-neon-cyan">Armor:</span> <span className="text-white">{(player.armor * 100).toFixed(0)}%</span></div>
                      )}
                      {player.dodge && player.dodge > 0 && (
                        <div><span className="text-neon-cyan">Dodge:</span> <span className="text-white">{(player.dodge * 100).toFixed(0)}%</span></div>
                      )}
                      {player.regeneration && player.regeneration > 0 && (
                        <div><span className="text-neon-cyan">Regen:</span> <span className="text-white">{player.regeneration.toFixed(1)}/s</span></div>
                      )}
                      {player.thorns && player.thorns > 0 && (
                        <div><span className="text-neon-cyan">Thorns:</span> <span className="text-white">{(player.thorns * 100).toFixed(0)}%</span></div>
                      )}
                      {player.shield && player.shield > 0 && (
                        <div><span className="text-neon-cyan">Shield:</span> <span className="text-white">{player.shield}/{player.maxShield}</span></div>
                      )}
                      {player.fireDamage && player.fireDamage > 0 && (
                        <div><span className="text-neon-cyan">Fire DoT:</span> <span className="text-white">{(player.fireDamage * 100).toFixed(0)}%</span></div>
                      )}
                      {player.poisonDamage && player.poisonDamage > 0 && (
                        <div><span className="text-neon-cyan">Poison DoT:</span> <span className="text-white">{(player.poisonDamage * 100).toFixed(0)}%</span></div>
                      )}
                      {player.iceSlow && player.iceSlow > 0 && (
                        <div><span className="text-neon-cyan">Ice Slow:</span> <span className="text-white">{(player.iceSlow * 100).toFixed(0)}%</span></div>
                      )}
                      {player.explosionDamage && player.explosionDamage > 0 && (
                        <div><span className="text-neon-cyan">Explosion:</span> <span className="text-white">{player.explosionDamage.toFixed(1)}x</span></div>
                      )}
                      {player.pierceCount && player.pierceCount > 0 && (
                        <div><span className="text-neon-cyan">Pierce:</span> <span className="text-white">{player.pierceCount}</span></div>
                      )}
                      {player.chainCount && player.chainCount > 0 && (
                        <div><span className="text-neon-cyan">Chain:</span> <span className="text-white">{player.chainCount}</span></div>
                      )}
                      {player.ricochetCount && player.ricochetCount > 0 && (
                        <div><span className="text-neon-cyan">Ricochet:</span> <span className="text-white">{player.ricochetCount}</span></div>
                      )}
                      {player.homingStrength && player.homingStrength > 0 && (
                        <div><span className="text-neon-cyan">Homing:</span> <span className="text-white">{(player.homingStrength * 100).toFixed(0)}%</span></div>
                      )}
                      {player.knockbackForce && player.knockbackForce > 0 && (
                        <div><span className="text-neon-cyan">Knockback:</span> <span className="text-white">{player.knockbackForce.toFixed(0)}</span></div>
                      )}
                      {player.hasBananarang && (
                        <div><span className="text-neon-cyan">Bananarangs:</span> <span className="text-white">x{player.bananarangsPerShot || 1}</span></div>
                      )}
                      {player.hasPet && (
                        <div className="col-span-2"><span className="text-neon-cyan">Pet:</span> <span className="text-white">Active 🐾</span></div>
                      )}
                    </div>
                    {player.collectedUpgrades && player.collectedUpgrades.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="font-press-start text-lg text-neon-yellow mb-2">
                          UPGRADES ({player.collectedUpgrades.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {player.collectedUpgrades.map((upgrade, idx) => (
                            <div
                              key={idx}
                              className="px-3 py-1 rounded border text-sm"
                              style={{
                                borderColor: 
                                  upgrade.rarity === 'legendary' ? '#FFD700' :
                                  upgrade.rarity === 'boss' ? '#FF00FF' :
                                  upgrade.rarity === 'lunar' ? '#00FFFF' :
                                  upgrade.rarity === 'void' ? '#9333EA' :
                                  upgrade.rarity === 'uncommon' ? '#10B981' :
                                  '#6B7280',
                                color:
                                  upgrade.rarity === 'legendary' ? '#FFD700' :
                                  upgrade.rarity === 'boss' ? '#FF00FF' :
                                  upgrade.rarity === 'lunar' ? '#00FFFF' :
                                  upgrade.rarity === 'void' ? '#9333EA' :
                                  upgrade.rarity === 'uncommon' ? '#10B981' :
                                  '#9CA3AF'
                              }}
                            >
                              {upgrade.emoji} {upgrade.title} {upgrade.count > 1 && `x${upgrade.count}`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
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
        <p>Built with ❤️ from Wilsman</p>
      </footer>
    </main>
  );
}

