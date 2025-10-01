import React, { useMemo } from 'react';
import type { Player } from '@shared/types';

interface StatsPanelProps {
  player: Player;
}

interface WeaponStats {
  name: string;
  baseDamage: number;
  totalDamage: number;
  dps: number;
  projectilesPerShot: number;
  critChance: number;
  critMultiplier: number;
}

export default function StatsPanel({ player }: StatsPanelProps) {
  const stats = useMemo(() => {
    const weapons: WeaponStats[] = [];
    
    // Bullet weapon stats
    const bulletBaseDamage = player.projectileDamage;
    const bulletTotalDamage = bulletBaseDamage * player.projectilesPerShot;
    const bulletDps = (bulletTotalDamage / player.attackSpeed) * 1000;
    
    weapons.push({
      name: 'Bullets',
      baseDamage: bulletBaseDamage,
      totalDamage: bulletTotalDamage,
      dps: bulletDps,
      projectilesPerShot: player.projectilesPerShot,
      critChance: player.critChance,
      critMultiplier: player.critMultiplier,
    });
    
    // Bananarang weapon stats (if unlocked)
    if (player.hasBananarang && player.bananarangsPerShot) {
      const bananaBaseDamage = bulletBaseDamage * 0.8; // Bananas do 80% of bullet damage
      const bananaTotalDamage = bananaBaseDamage * player.bananarangsPerShot;
      const bananaDps = (bananaTotalDamage / player.attackSpeed) * 1000;
      
      weapons.push({
        name: 'Bananarangs',
        baseDamage: bananaBaseDamage,
        totalDamage: bananaTotalDamage,
        dps: bananaDps,
        projectilesPerShot: player.bananarangsPerShot,
        critChance: player.critChance,
        critMultiplier: player.critMultiplier,
      });
    }
    
    // Overall stats
    const overallDps = weapons.reduce((sum, w) => sum + w.dps, 0);
    const overallTotalDamage = weapons.reduce((sum, w) => sum + w.totalDamage, 0);
    
    return { weapons, overallDps, overallTotalDamage };
  }, [player]);

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 w-64 p-4 border-2 border-neon-cyan bg-black/90 backdrop-blur-sm transition-transform duration-300 hover:translate-x-0 translate-x-[calc(100%-2rem)] z-40 group" style={{ boxShadow: '0 0 10px #00FFFF' }}>
      {/* Hover Tab */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-8 h-16 bg-neon-cyan/20 border-2 border-r-0 border-neon-cyan flex items-center justify-center group-hover:bg-neon-cyan/40 transition-colors">
        <span className="font-press-start text-[8px] text-neon-cyan rotate-90">STATS</span>
      </div>
      <h2 className="font-press-start text-xs text-neon-yellow mb-3 text-center border-b border-neon-yellow pb-2">
        STATS
      </h2>
      
      {/* Overall Stats */}
      <div className="mb-3 pb-3 border-b border-neon-cyan/30">
        <div className="space-y-1 font-vt323 text-sm">
          <StatRow label="Total DPS" value={stats.overallDps.toFixed(1)} color="text-red-400" />
          <StatRow label="Total Damage/Shot" value={stats.overallTotalDamage.toFixed(1)} color="text-orange-400" />
        </div>
      </div>
      
      {/* Weapon-Specific Stats */}
      {stats.weapons.map((weapon, idx) => (
        <div key={weapon.name} className={`mb-3 pb-3 ${idx < stats.weapons.length - 1 ? 'border-b border-neon-pink/30' : ''}`}>
          <h3 className="font-press-start text-[10px] text-neon-pink mb-2">{weapon.name.toUpperCase()}</h3>
          <div className="space-y-1 font-vt323 text-sm">
            <StatRow label="Base Damage" value={weapon.baseDamage.toFixed(1)} />
            <StatRow label="Total Damage" value={weapon.totalDamage.toFixed(1)} />
            <StatRow label="DPS" value={weapon.dps.toFixed(1)} color="text-red-400" />
            <StatRow label="Projectiles/Shot" value={weapon.projectilesPerShot.toString()} />
            <StatRow label="Crit Chance" value={`${(weapon.critChance * 100).toFixed(0)}%`} color="text-yellow-400" />
            <StatRow label="Crit Multiplier" value={`${weapon.critMultiplier.toFixed(1)}x`} color="text-yellow-400" />
          </div>
        </div>
      ))}
      
      {/* Player Stats */}
      <div className="mb-3 pb-3 border-b border-neon-yellow/30">
        <h3 className="font-press-start text-[10px] text-neon-yellow mb-2">PLAYER</h3>
        <div className="space-y-1 font-vt323 text-sm">
          <StatRow label="Health" value={`${player.health.toFixed(0)}/${player.maxHealth}`} color="text-red-500" />
          <StatRow label="Movement Speed" value={player.speed.toFixed(1)} color="text-cyan-400" />
          <StatRow label="Attack Speed" value={`${(1000 / player.attackSpeed).toFixed(2)}/s`} color="text-purple-400" />
          <StatRow label="Life Steal" value={`${(player.lifeSteal * 100).toFixed(0)}%`} color="text-green-400" />
          <StatRow label="Pickup Radius" value={player.pickupRadius.toFixed(0)} color="text-purple-300" />
        </div>
      </div>
      
      {/* Level & XP */}
      <div className="mb-3 pb-3 border-b border-neon-cyan/30">
        <h3 className="font-press-start text-[10px] text-neon-cyan mb-2">PROGRESSION</h3>
        <div className="space-y-1 font-vt323 text-sm">
          <StatRow label="Level" value={player.level.toString()} color="text-neon-yellow" />
          <StatRow label="XP" value={`${player.xp}/${player.xpToNextLevel}`} color="text-purple-400" />
        </div>
      </div>

      {/* Character Abilities */}
      {(player.characterType === 'dash-dynamo' || player.characterType === 'turret-tina' || player.characterType === 'vampire-vex') && (
        <div>
          <h3 className="font-press-start text-[10px] text-neon-pink mb-2">ABILITIES</h3>
          <div className="space-y-1 font-vt323 text-sm">
            {player.characterType === 'dash-dynamo' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Blink (Shift):</span>
                <span className={player.blinkReady ? 'text-green-400 font-bold' : 'text-red-400'}>
                  {player.blinkReady ? 'READY' : `${((player.blinkCooldown || 0) / 1000).toFixed(1)}s`}
                </span>
              </div>
            )}
            {player.characterType === 'turret-tina' && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Place Turret (E):</span>
                <span className="text-orange-400 font-bold">READY</span>
              </div>
            )}
            {player.characterType === 'vampire-vex' && player.vampireDrainRadius && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Drain Radius:</span>
                <span className="text-red-400 font-bold">{player.vampireDrainRadius.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, color = 'text-white' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={`${color} font-bold`}>{value}</span>
    </div>
  );
}
