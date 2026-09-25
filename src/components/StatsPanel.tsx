import React, { useMemo } from "react";
import type { Player } from "@shared/types";

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
    const isMeleeWeapon = player.weaponType === "energy-blade";
    const averageBladeDamage =
      player.projectileDamage *
      (1 + Math.max(0, (player.projectilesPerShot || 1) - 1) * 0.08) *
      1.28;

    if (isMeleeWeapon) {
      weapons.push({
        name: "Energy Blade",
        baseDamage: player.projectileDamage,
        totalDamage: averageBladeDamage,
        dps: (averageBladeDamage / player.attackSpeed) * 1000,
        projectilesPerShot: player.projectilesPerShot,
        critChance: player.critChance,
        critMultiplier: player.critMultiplier,
      });
    } else {
      const bulletBaseDamage = player.projectileDamage;
      const bulletTotalDamage = bulletBaseDamage * player.projectilesPerShot;
      const bulletDps = (bulletTotalDamage / player.attackSpeed) * 1000;

      weapons.push({
        name: "Bullets",
        baseDamage: bulletBaseDamage,
        totalDamage: bulletTotalDamage,
        dps: bulletDps,
        projectilesPerShot: player.projectilesPerShot,
        critChance: player.critChance,
        critMultiplier: player.critMultiplier,
      });
    }

    // Bananarang weapon stats (if unlocked)
    if (player.hasBananarang && player.bananarangsPerShot) {
      const bananaBaseDamage = player.projectileDamage * 0.8; // Bananas do 80% of bullet damage
      const bananaTotalDamage = bananaBaseDamage * player.bananarangsPerShot;
      const bananaDps = (bananaTotalDamage / player.attackSpeed) * 1000;

      weapons.push({
        name: "Bananarangs",
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
    const overallTotalDamage = weapons.reduce(
      (sum, w) => sum + w.totalDamage,
      0
    );

    return { weapons, overallDps, overallTotalDamage };
  }, [player]);

  return (
    <div className="group fixed right-0 top-[60%] z-40 -translate-y-1/2">
      {/* Hover Tab */}
      <div className="absolute right-0 top-1/2 flex h-20 w-6 -translate-y-1/2 items-center justify-center rounded-l-md border border-r-0 border-white/10 bg-slate-950/70 backdrop-blur-sm transition-colors group-hover:bg-slate-800/70">
        <span className="font-press-start text-[7px] tracking-widest text-slate-400 [writing-mode:vertical-rl]">
          STATS
        </span>
      </div>
      <div className="max-h-[80vh] w-64 translate-x-full overflow-y-auto rounded-l-md border border-r-0 border-white/10 bg-slate-950/70 p-3 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0">
      <h2 className="font-press-start text-[9px] tracking-widest text-slate-400 mb-3 text-center border-b border-white/10 pb-2">
        STATS
      </h2>

      {/* Overall Stats */}
      <div className="mb-3 pb-3 border-b border-white/10">
        <div className="space-y-1 text-xs">
          <StatRow
            label="Total DPS"
            value={stats.overallDps.toFixed(1)}
            color="text-red-400"
          />
          <StatRow
            label="Total Damage/Shot"
            value={stats.overallTotalDamage.toFixed(1)}
            color="text-orange-400"
          />
        </div>
      </div>

      {/* Weapon-Specific Stats */}
      {stats.weapons.map((weapon, idx) => (
        <div
          key={weapon.name}
          className={`mb-3 pb-3 ${
            idx < stats.weapons.length - 1 ? "border-b border-white/10" : ""
          }`}
        >
          <h3 className="font-press-start text-[8px] tracking-widest text-slate-400 mb-2 uppercase">
            {weapon.name.toUpperCase()}
          </h3>
          <div className="space-y-1 text-xs">
            <StatRow label="Base Damage" value={weapon.baseDamage.toFixed(1)} />
            <StatRow
              label="Total Damage"
              value={weapon.totalDamage.toFixed(1)}
            />
            <StatRow
              label="DPS"
              value={weapon.dps.toFixed(1)}
              color="text-red-400"
            />
            <StatRow
              label="Projectiles/Shot"
              value={weapon.projectilesPerShot.toString()}
            />
            <StatRow
              label="Crit Chance"
              value={`${(weapon.critChance * 100).toFixed(0)}%`}
              color="text-yellow-400"
            />
            <StatRow
              label="Crit Multiplier"
              value={`${weapon.critMultiplier.toFixed(1)}x`}
              color="text-yellow-400"
            />
          </div>
        </div>
      ))}

      {/* Player Stats */}
      <div className="mb-3 pb-3 border-b border-white/10">
        <h3 className="font-press-start text-[8px] tracking-widest text-slate-400 mb-2 uppercase">
          PLAYER
        </h3>
        <div className="space-y-1 text-xs">
          <StatRow
            label="Health"
            value={`${player.health.toFixed(0)}/${player.maxHealth}`}
            color="text-red-500"
          />
          <StatRow
            label="Movement Speed"
            value={player.speed.toFixed(1)}
            color="text-cyan-400"
          />
          <StatRow
            label="Attack Speed"
            value={`${(1000 / player.attackSpeed).toFixed(2)}/s`}
            color="text-purple-400"
          />
          <StatRow
            label="Life Steal"
            value={`${(player.lifeSteal * 100).toFixed(0)}%`}
            color="text-green-400"
          />
          <StatRow
            label="Pickup Radius"
            value={player.pickupRadius.toFixed(0)}
            color="text-purple-300"
          />
        </div>
      </div>

      {/* Level & XP */}
      <div className="mb-3 pb-3 border-b border-white/10">
        <h3 className="font-press-start text-[8px] tracking-widest text-slate-400 mb-2 uppercase">
          PROGRESSION
        </h3>
        <div className="space-y-1 text-xs">
          <StatRow
            label="Level"
            value={player.level.toString()}
            color="text-yellow-300"
          />
          <StatRow
            label="XP"
            value={`${Math.floor(player.xp)}/${player.xpToNextLevel}`}
            color="text-purple-400"
          />
          <StatRow
            label="Coins"
            value={`${Math.floor(player.coins || 0)}`}
            color="text-yellow-300"
          />
        </div>
      </div>

      {/* Character Passive Abilities */}
      {(player.characterType === "dash-dynamo" ||
        player.characterType === "turret-tina" ||
        player.characterType === "vampire-vex" ||
        player.characterType === "null-ronin") && (
        <div className="mb-3 pb-3 border-b border-white/10">
          <h3 className="font-press-start text-[8px] tracking-widest text-slate-400 mb-2 uppercase">
            PASSIVES
          </h3>
          <div className="space-y-1 text-xs">
            {player.characterType === "dash-dynamo" && (
              <StatRow
                label="Blink (Space)"
                value={
                  player.blinkReady
                    ? "READY"
                    : `${((player.blinkCooldown || 0) / 1000).toFixed(1)}s`
                }
                color={player.blinkReady ? "text-green-400" : "text-red-400"}
              />
            )}
            {player.characterType === "turret-tina" && (
              <StatRow
                label="Place Turret (E)"
                value="READY"
                color="text-orange-400"
              />
            )}
            {player.characterType === "vampire-vex" &&
              player.vampireDrainRadius && (
                <StatRow
                  label="Drain Radius"
                  value={player.vampireDrainRadius.toFixed(0)}
                  color="text-red-400"
                />
              )}
            {player.characterType === "null-ronin" && (
              <StatRow
                label="Finisher"
                value={
                  (player.meleeComboStep || 0) >= 2
                    ? "READY"
                    : `${(player.meleeComboStep || 0) + 1}/3`
                }
                color={
                  (player.meleeComboStep || 0) >= 2
                    ? "text-yellow-300"
                    : "text-cyan-300"
                }
              />
            )}
          </div>
        </div>
      )}

      {/* Active Ultimate Ability (Q) */}
      <div>
        <h3 className="font-press-start text-[8px] tracking-widest text-slate-400 mb-2 uppercase">
          ULTIMATE (Q)
        </h3>
        <div className="space-y-1 text-xs">
          <StatRow
            label="Cooldown"
            value={
              player.abilityCooldown && player.abilityCooldown > 0
                ? `${(player.abilityCooldown / 1000).toFixed(1)}s`
                : "READY"
            }
            color={
              player.abilityCooldown && player.abilityCooldown > 0
                ? "text-red-400"
                : "text-green-400"
            }
          />
          {player.isAbilityActive && (
            <div className="flex justify-between items-center">
              <span className="text-pink-400 animate-pulse font-bold">
                ACTIVE!
              </span>
              <span className="text-pink-400 font-bold">
                {((player.abilityDuration || 0) / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={`${color} font-bold`}>{value}</span>
    </div>
  );
}
