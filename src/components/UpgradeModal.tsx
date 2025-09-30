import React, { useEffect, useState } from 'react';
import { useGameStore } from '@/hooks/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import type { UpgradeOption, UpgradeRarity } from '@shared/types';

const RARITY_STYLES: Record<UpgradeRarity, { border: string; text: string; glow: string; bg: string }> = {
  common: { border: 'border-white', text: 'text-white', glow: 'shadow-white', bg: 'hover:bg-white/10' },
  uncommon: { border: 'border-green-400', text: 'text-green-400', glow: 'shadow-green-400', bg: 'hover:bg-green-400/10' },
  legendary: { border: 'border-red-400', text: 'text-red-400', glow: 'shadow-red-400', bg: 'hover:bg-red-400/10' },
  boss: { border: 'border-yellow-400', text: 'text-yellow-400', glow: 'shadow-yellow-400', bg: 'hover:bg-yellow-400/10' },
  lunar: { border: 'border-blue-400', text: 'text-blue-400', glow: 'shadow-blue-400', bg: 'hover:bg-blue-400/10' },
  void: { border: 'border-purple-400', text: 'text-purple-400', glow: 'shadow-purple-400', bg: 'hover:bg-purple-400/10' },
};

interface UpgradeModalProps {
  onSelectUpgrade: (upgradeId: string) => void;
}
export default function UpgradeModal({ onSelectUpgrade }: UpgradeModalProps) {
  const { isUpgradeModalOpen, upgradeOptions } = useGameStore(
    useShallow((state) => ({
      isUpgradeModalOpen: state.isUpgradeModalOpen,
      upgradeOptions: state.upgradeOptions,
    }))
  );
  
  const [showTitle, setShowTitle] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [explosionParticles, setExplosionParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number }>>([]);

  useEffect(() => {
    if (isUpgradeModalOpen) {
      // Reset animation state
      setShowTitle(false);
      setShowCards(false);
      setParticles([]);
      
      // Generate particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);
      
      // Stagger animations
      setTimeout(() => setShowTitle(true), 100);
      setTimeout(() => setShowCards(true), 600);
    }
  }, [isUpgradeModalOpen]);

  if (!isUpgradeModalOpen) return null;
  
  const handleSelect = (option: UpgradeOption, index: number, event: React.MouseEvent<HTMLDivElement>) => {
    setSelectedIndex(index);
    
    // Create explosion particles from click position
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newExplosionParticles = Array.from({ length: 50 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 50;
      const velocity = 5 + Math.random() * 10;
      return {
        id: i,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
      };
    });
    setExplosionParticles(newExplosionParticles);
    
    // Delay the actual selection to show animation
    setTimeout(() => {
      onSelectUpgrade(option.id);
    }, 800);
  };
  
  const getCardStyle = (index: number) => {
    const baseStyle = {
      transition: 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s ease-in-out, filter 1.2s ease-in-out',
      willChange: 'transform, opacity, filter',
    };
    
    if (selectedIndex !== null) {
      // Selection animation
      if (index === selectedIndex) {
        return {
          ...baseStyle,
          transition: 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.8s ease-out',
          transform: 'scale(1.5) rotate(360deg) translateY(-100px)',
          zIndex: 100,
        };
      } else {
        return {
          ...baseStyle,
          transform: 'scale(0.5)',
          opacity: 0,
          filter: 'blur(4px)',
        };
      }
    }
    
    if (hoveredIndex === null) {
      // Default hand position - cards slightly fanned
      if (index === 0) return { ...baseStyle, transform: 'rotate(-3deg)' };
      if (index === 2) return { ...baseStyle, transform: 'rotate(3deg)' };
      return { ...baseStyle, transform: 'rotate(0deg)' };
    }
    
    // Hover separation effect - like examining a card in your hand
    if (index === hoveredIndex) {
      // Hovered card pops up and straightens
      return {
        ...baseStyle,
        transform: 'scale(1.1) translateY(-48px) rotate(0deg)',
        zIndex: 50,
      };
    } else if (index < hoveredIndex) {
      // Left card(s) rotate and slide away
      return {
        ...baseStyle,
        transform: 'translateX(-96px) rotate(-12deg) scale(0.9) translateY(16px)',
        opacity: 0.6,
      };
    } else {
      // Right card(s) rotate and slide away
      return {
        ...baseStyle,
        transform: 'translateX(96px) rotate(12deg) scale(0.9) translateY(16px)',
        opacity: 0.6,
      };
    }
  };
  
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Particle effects */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-neon-yellow rounded-full animate-pulse"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animation: `twinkle 2s ease-in-out ${particle.delay}s infinite, float 3s ease-in-out ${particle.delay}s infinite`,
            boxShadow: '0 0 10px #FFFF00',
          }}
        />
      ))}
      
      {/* Explosion particles on selection */}
      {explosionParticles.map((particle) => (
        <div
          key={`explosion-${particle.id}`}
          className="absolute w-3 h-3 bg-neon-yellow rounded-full pointer-events-none"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            animation: 'explode 1s ease-out forwards',
            transform: `translate(${particle.vx * 20}px, ${particle.vy * 20}px)`,
            boxShadow: '0 0 15px #FFFF00',
          }}
        />
      ))}
      
      {/* Title with epic entrance */}
      <h2 
        className={`font-press-start text-5xl text-neon-yellow mb-12 transition-all duration-700 ${
          showTitle 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-150 -translate-y-20'
        } ${selectedIndex !== null ? 'scale-0 opacity-0' : ''}`}
        style={{ 
          textShadow: '0 0 20px #FFFF00, 0 0 40px #FFFF00, 0 0 60px #FFFF00',
          animation: showTitle ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      >
        LEVEL UP!
      </h2>
      
      {/* Cards with staggered entrance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {upgradeOptions.map((option, index) => {
          const styles = RARITY_STYLES[option.rarity || 'common'];
          const emoji = option.emoji || '🎁';
          const delay = index * 200;
          const cardStyle = getCardStyle(index);
          
          return (
            <div
              key={option.id}
              className={`w-72 h-80 border-2 ${styles.border} p-6 flex flex-col justify-between bg-black/50 ${styles.bg} ${styles.glow} cursor-pointer ${
                showCards 
                  ? 'opacity-100' 
                  : 'opacity-0 scale-50 translate-y-20 rotate-12'
              }`}
              onClick={(e) => handleSelect(option, index, e)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ 
                boxShadow: `0 0 30px ${styles.border.replace('border-', '')}, 0 0 60px ${styles.border.replace('border-', '')}`,
                transitionDelay: selectedIndex !== null ? '0ms' : `${delay}ms`,
                animation: showCards && selectedIndex === null && hoveredIndex === null ? 'cardFloat 3s ease-in-out infinite' : 'none',
                animationDelay: `${delay}ms`,
                ...cardStyle,
              }}
            >
              <div className="text-center">
                <div 
                  className="text-5xl mb-2 transition-transform duration-300"
                  style={{
                    animation: showCards && selectedIndex === null ? 'bounce 1s ease-in-out infinite' : 'none',
                    animationDelay: `${delay + 600}ms`,
                  }}
                >
                  {emoji}
                </div>
                <p className={`font-press-start text-[8px] ${styles.text} mb-2 uppercase tracking-wider`}>
                  {option.rarity || 'common'}
                </p>
                <h3 className={`font-press-start text-lg ${styles.text} mb-4`}>
                  {option.title}
                </h3>
                <p className="font-vt323 text-lg text-white/80">
                  {option.description}
                </p>
              </div>
              <Button
                variant="outline"
                className={`w-full font-press-start text-lg bg-transparent border-2 ${styles.border} ${styles.text} h-12 hover:bg-${styles.border.replace('border-', '')}/20 hover:text-black transition-all duration-300`}
              >
                SELECT
              </Button>
            </div>
          );
        })}
      </div>
      
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes explode {
          0% { 
            opacity: 1; 
            transform: translate(0, 0) scale(1);
          }
          100% { 
            opacity: 0; 
            transform: translate(var(--tx, 0), var(--ty, 0)) scale(0);
          }
        }
      `}</style>
    </div>
  );
}