import type { Player, UpgradeType } from '@shared/types';

export function applyUpgradeEffect(player: Player, upgradeType: UpgradeType): void {
  switch (upgradeType) {
    // ===== BASIC STATS =====
    case 'attackSpeed':
      player.attackSpeed = Math.max(60, player.attackSpeed * 0.8);
      break;
    case 'projectileDamage':
      player.projectileDamage += 5;
      break;
    case 'playerSpeed':
      player.speed *= 1.15;
      break;
    case 'maxHealth':
      player.maxHealth += 20;
      player.health = Math.min(player.maxHealth, player.health + 20);
      break;
    case 'pickupRadius':
      player.pickupRadius = Math.min(300, player.pickupRadius * 1.3);
      break;
    case 'multiShot':
      player.projectilesPerShot = Math.min(10, player.projectilesPerShot + 1);
      break;
    case 'critChance':
      player.critChance = Math.min(0.75, player.critChance + 0.10);
      break;
    case 'critDamage':
      player.critMultiplier += 0.5;
      break;
    case 'lifeSteal':
      player.lifeSteal = Math.min(0.50, player.lifeSteal + 0.05);
      break;

    // ===== ARSENAL =====
    case 'bananarang':
      if (!player.hasBananarang) {
        player.hasBananarang = true;
        player.bananarangsPerShot = 1;
      } else {
        player.bananarangsPerShot = Math.min(10, (player.bananarangsPerShot || 1) + 1);
      }
      break;

    // ===== DEFENSIVE =====
    case 'armor':
      player.armor = Math.min(0.50, (player.armor || 0) + 0.05);
      break;
    case 'dodge':
      player.dodge = Math.min(0.30, (player.dodge || 0) + 0.05);
      break;
    case 'regeneration':
      player.regeneration = (player.regeneration || 0) + 1;
      break;
    case 'thorns':
      player.thorns = Math.min(0.50, (player.thorns || 0) + 0.20);
      break;
    case 'shield':
      player.maxShield = (player.maxShield || 0) + 50;
      player.shield = player.maxShield;
      break;

    // ===== ELEMENTAL/STATUS =====
    case 'fireDamage':
      player.fireDamage = (player.fireDamage || 0) + 1.0; // 100% damage over 2s
      break;
    case 'poisonDamage':
      player.poisonDamage = (player.poisonDamage || 0) + 0.5; // 50% damage over 3s
      break;
    case 'iceSlow':
      player.iceSlow = Math.min(0.70, (player.iceSlow || 0) + 0.40);
      break;

    // ===== PROJECTILE MODIFIERS =====
    case 'pierce':
      player.pierceCount = (player.pierceCount || 0) + 1;
      break;
    case 'chain':
      player.chainCount = (player.chainCount || 0) + 2;
      break;
    case 'ricochet':
      player.ricochetCount = (player.ricochetCount || 0) + 3;
      break;
    case 'homingShots':
      player.homingStrength = Math.min(1.0, (player.homingStrength || 0) + 0.3);
      break;
    case 'knockback':
      player.knockbackForce = (player.knockbackForce || 0) + 30;
      break;
    case 'explosion':
      player.explosionDamage = (player.explosionDamage || 0) + 2.0; // 200% AoE damage
      break;

    // ===== SPECIAL =====
    case 'vampiric':
      player.lifeSteal = Math.min(0.50, (player.lifeSteal || 0) + 0.10);
      break;
    case 'berserker':
      // Handled in damage calculation
      break;
    case 'lucky':
      player.hasLucky = true;
      break;
    case 'timeWarp':
      player.hasTimeWarp = true;
      break;
    case 'executioner':
      // Handled in damage calculation
      break;
    case 'magnetic':
      player.pickupRadius = Math.min(300, player.pickupRadius * 1.6);
      break;
    case 'omniGlitch':
      player.hasOmniGlitch = true;
      player.pierceCount = (player.pierceCount || 0) + 10;
      break;
    case 'systemOverload':
      player.hasSystemOverload = true;
      break;
    case 'godMode':
      player.hasGodMode = true;
      player.godModeCooldown = 0;
      break;

    // ===== ADVANCED =====
    case 'pet':
      player.hasPet = true;
      break;
    case 'orbital':
      player.orbitalCount = (player.orbitalCount || 0) + 1;
      break;
    case 'clone':
      player.cloneCount = (player.cloneCount || 0) + 1;
      break;

    // ===== ADVANCED (Not yet implemented) =====
    case 'ghostBullets':
    case 'invincibility':
    case 'aura':
    case 'turret':
    case 'reflect':
    case 'dash':
    case 'doubleJump':
      // These require more complex systems - placeholder for now
      break;
  }
}
