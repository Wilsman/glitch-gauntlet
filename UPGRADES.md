# Upgrade System Documentation

This document provides a comprehensive overview of all upgrades in the game, their properties, mechanics, and visual effects.

---

## 🎯 Upgrade Categories

- **Common (White)** - 50% drop rate - Basic stat improvements
- **Uncommon (Green)** - 30% drop rate - Stronger effects
- **Legendary (Red)** - 10% drop rate - Powerful game-changers
- **Boss (Yellow)** - 5% drop rate - Unique boss-themed items
- **Lunar (Blue)** - 3% drop rate - High risk/reward
- **Void (Purple)** - 2% drop rate - Corrupted versions

---

## 📊 All Upgrades

### ⚔️ Offensive Stats

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **attackSpeed** | Common | +20% fire rate (max 60ms cooldown) | ✅ | None |
| **projectileDamage** | Common | +5 damage per shot | ✅ | None |
| **critChance** | Common | +10% crit chance (max 75%) | ✅ | Red damage numbers |
| **critDamage** | Uncommon | +0.5x crit multiplier | ✅ | Larger red numbers |
| **multiShot** | Uncommon | +1 projectile per shot (max 10) | ✅ | More bullets |
| **berserker** | Legendary | +50% damage when below 30% HP | ✅ | Red pulsing glow |
| **executioner** | Legendary | Instant kill enemies below 15% HP | ✅ | Special kill effect |

### 🛡️ Defensive Stats

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **maxHealth** | Common | +20 max HP and heal 20 | ✅ | None |
| **armor** | Common | +5% damage reduction (max 50%) | ✅ | None |
| **dodge** | Common | +5% chance to avoid damage (max 30%) | ✅ | Flash when dodged |
| **regeneration** | Common | +1 HP/sec passive healing | ✅ | None |
| **shield** | Uncommon | +50 shield that absorbs damage | ✅ | Blue ring around player |
| **thorns** | Uncommon | Reflect 20% damage back (max 50%) | ✅ | None |

### 🏃 Movement & Utility

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **playerSpeed** | Common | +15% movement speed | ✅ | None |
| **pickupRadius** | Common | +20% XP collection radius (max 120) | ✅ | Purple dashed circle |
| **magnetic** | Common | +30% XP collection radius (max 150) | ✅ | Purple dashed circle |

### 💉 Life Steal & Healing

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **lifeSteal** | Uncommon | Heal 5% of damage dealt (max 50%) | ✅ | Green flash on player |
| **vampiric** | Uncommon | Heal 10% of damage dealt (max 50%) | ✅ | Green flash on player |

### 🔥 Elemental Effects

| Upgrade Type | Rarity | Effect | Duration | Visual Effect |
|-------------|--------|--------|----------|---------------|
| **fireDamage** | Void | 100% damage as burn DoT | 2 seconds | Orange/red enemy glow |
| **poisonDamage** | Void | 50% damage as poison DoT | 3 seconds | Green enemy glow |
| **iceSlow** | Void | 40% slow on hit (max 70%) | 2 seconds | Cyan/blue enemy tint |

### 💥 Projectile Modifiers

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **pierce** | Uncommon | Bullets pierce +1 enemy | ✅ | Bullets pass through |
| **knockback** | Uncommon | Push enemies back +30 units | ✅ | Enemies pushed |
| **explosion** | Legendary | 200% AoE damage on kill | ✅ | Expanding orange circle |
| **bananarang** | Legendary | Add returning banana projectile | ✅ | Yellow spinning ring |
| **chain** | Uncommon | Chain to +2 nearby enemies | ✅ | Lightning effect (TODO) |
| **ricochet** | Legendary | Bullets bounce +3 times | ✅ | Bouncing bullets (TODO) |
| **homingShots** | Uncommon | +0.3 homing strength (max 1.0) | ✅ | Bullets curve (TODO) |

### 🎲 Special Effects

| Upgrade Type | Rarity | Effect | Stacks? | Visual Effect |
|-------------|--------|--------|---------|---------------|
| **lucky** | Legendary | Double all drops | ✅ | None |
| **timeWarp** | Legendary | Slow enemies by 30% | ✅ | Slow-motion effect (TODO) |

### 🚧 Not Yet Implemented

These upgrades are defined but need full implementation:

| Upgrade Type | Rarity | Planned Effect |
|-------------|--------|----------------|
| **ghostBullets** | Lunar | Bullets phase through walls, +20% damage taken |
| **clone** | Legendary | Summon a clone that fights with you |
| **orbital** | Legendary | Spinning death orbs protect you |
| **invincibility** | Legendary | Survive lethal damage once per wave |
| **aura** | Boss | Enemies near you deal 30% less damage |
| **pet** | Boss | Summon a familiar that attacks enemies |
| **turret** | Boss | Deploy a turret that shoots enemies |
| **reflect** | Boss | Reflect 50% of projectiles |
| **dash** | Boss | Dash through enemies |
| **doubleJump** | Boss | Double jump ability |

---

## 🔧 Technical Implementation

### Status Effects System

Enemies can have multiple status effects simultaneously:

```typescript
interface StatusEffect {
  type: 'burning' | 'poisoned' | 'frozen' | 'slowed';
  damage?: number; // DoT damage per tick
  duration: number; // remaining duration in ms
  slowAmount?: number; // movement speed multiplier (0-1)
}
```

### Explosion System

```typescript
interface Explosion {
  id: string;
  position: Vector2D;
  radius: number; // 80 units
  timestamp: number;
  damage: number; // Based on enemy max HP * explosionDamage multiplier
  ownerId: string;
}
```

### Pierce System

Projectiles track hit enemies to prevent double-hits:

```typescript
interface Projectile {
  hitEnemies?: string[]; // IDs of enemies already hit
  pierceRemaining?: number; // how many more enemies can be pierced
}
```

---

## 📈 Upgrade Stacking Rules

### Additive Stacking
- **Damage**: +5 per stack
- **Health**: +20 per stack
- **Projectiles**: +1 per stack
- **Pierce**: +1 per stack
- **Chain**: +2 per stack
- **Ricochet**: +3 per stack

### Multiplicative Stacking
- **Attack Speed**: 0.8x per stack (faster)
- **Movement Speed**: 1.15x per stack
- **Pickup Radius**: 1.2x per stack

### Percentage Stacking (Capped)
- **Crit Chance**: +10% per stack (max 75%)
- **Armor**: +5% per stack (max 50%)
- **Dodge**: +5% per stack (max 30%)
- **Life Steal**: +5% per stack (max 50%)
- **Thorns**: +20% per stack (max 50%)
- **Ice Slow**: +40% per stack (max 70%)

### Special Stacking
- **Bananarang**: First pick unlocks, subsequent picks add +1 banana (max 10)
- **Shield**: +50 per stack (no max)
- **Regeneration**: +1 HP/sec per stack (no max)

---

## 🎨 Visual Effect Colors

| Effect | Color | Hex Code |
|--------|-------|----------|
| Fire/Burning | Orange/Red | #FF6600 |
| Poison | Green | #00FF00 |
| Ice/Slow | Cyan/Blue | #00CCFF |
| Explosion | Orange | #FF6600 |
| Shield | Cyan | #00CCFF |
| Berserker | Red | #FF0000 |
| Heal | Green | #00FF00 |
| Crit | Red | #FF3333 |

---

## 🎮 Gameplay Tips

### Synergies

**Glass Cannon Build**
- Berserker + Max Health + Regeneration
- Stay at low HP for massive damage boost

**Tank Build**
- Armor + Shield + Thorns + Regeneration
- Reflect damage while staying alive

**DoT Build**
- Fire + Poison + Pierce
- Spread status effects to many enemies

**Crit Build**
- Crit Chance + Crit Damage + Multi Shot
- Massive burst damage

**Speed Build**
- Attack Speed + Movement Speed + Multi Shot
- Overwhelming firepower

---

## 📝 Update History

- **2025-09-29**: Initial documentation created
- All basic offensive, defensive, and elemental upgrades implemented
- Pierce, knockback, shield, armor, dodge, regeneration, thorns, berserker, executioner fully functional
- Fire, poison, ice, and explosion visual effects complete

---

**⚠️ IMPORTANT**: This document must be updated whenever upgrades are added, removed, or modified!
