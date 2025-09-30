# Enemy Scaling System

## Overview
The game features a dynamic enemy scaling system that increases difficulty as players progress through waves. Different enemy types have unique behaviors, stats, and scaling patterns.

## Enemy Types

### 1. Grunt (Basic Enemy)
- **Color**: Yellow (#FFFF00)
- **Size**: 20x20 pixels
- **Behavior**: Melee only - chases players and deals contact damage
- **Base Stats**:
  - Health: 20
  - Damage: 5
  - Speed: 2
  - XP Value: 5
- **Scaling per Wave**:
  - Health: +30% per wave
  - Damage: +20% per wave
  - Speed: +5% per wave
  - XP: +15% per wave
- **Spawn Weight**: 1.0 (standard spawn rate)

### 2. Slugger (Ranged Enemy)
- **Color**: Orange (#FF8800)
- **Size**: 24x24 pixels (slightly larger)
- **Behavior**: Ranged attacker - moves slower but shoots projectiles at players
- **Base Stats**:
  - Health: 30
  - Damage: 3 (per projectile)
  - Speed: 1.0 (50% slower than grunt)
  - XP Value: 8
  - Attack Speed: 2500ms (shoots every 2.5 seconds)
  - Projectile Speed: 5
  - Attack Range: 400 pixels
- **Scaling per Wave**:
  - Health: +40% per wave
  - Damage: +15% per wave
  - Speed: +3% per wave
  - XP: +20% per wave
  - Attack Speed: -5% per wave (shoots faster)
- **Spawn Weight**: 0.6 (spawns less frequently than grunts)
- **Projectile Appearance**: Red bullets (#FF0000)

## Scaling Formula

For each stat, the scaling is calculated using exponential growth:
```
scaled_value = base_value * (scaling_multiplier ^ (wave - 1))
```

Example for Grunt health at Wave 3:
```
health = 20 * (1.3 ^ 2) = 20 * 1.69 = 33.8 ≈ 34
```

## Enemy Spawning

- Enemies spawn randomly at the top or bottom edge of the arena
- Spawn rate increases with wave number: `0.05 + (wave * 0.01)`
- Maximum enemies on screen: `10 * player_count`
- Enemy type selection is weighted random based on spawn weights

## Adding New Enemy Types

To add a new enemy type:

1. **Update Types** (`shared/types.ts`):
   ```typescript
   export type EnemyType = 'grunt' | 'slugger' | 'your_new_type';
   ```

2. **Add Configuration** (`worker/enemyConfig.ts`):
   ```typescript
   your_new_type: {
     type: 'your_new_type',
     baseHealth: 50,
     baseDamage: 8,
     baseSpeed: 1.5,
     baseXpValue: 10,
     healthScaling: 1.35,
     damageScaling: 1.25,
     speedScaling: 1.04,
     xpScaling: 1.18,
     spawnWeight: 0.8,
     // Optional shooting config
     canShoot: true,
     baseAttackSpeed: 3000,
     baseProjectileSpeed: 5,
     attackSpeedScaling: 0.93,
   }
   ```

3. **Add Visual Rendering** (`src/components/GameCanvas.tsx`):
   ```typescript
   if (enemy.type === 'your_new_type') {
     fill = '#YOUR_COLOR';
     shadow = '#YOUR_COLOR';
     size = 28; // custom size
   }
   ```

4. **Optional: Add Custom Behavior** (`worker/durableObject.ts`):
   - Modify `updateEnemyAI()` to add special movement patterns
   - Add custom attack logic if needed

## Enemy Behaviors

### Movement
- Enemies track the closest alive player
- Movement speed can be affected by status effects (ice slow, frozen)
- Effective speed calculation includes slow multipliers

### Combat
- **Melee Enemies**: Deal damage on contact (within 20 pixels)
- **Ranged Enemies**: Shoot projectiles when within attack range
- All damage respects player's armor, dodge, and shield stats

### Status Effects
Enemies can be affected by player upgrades:
- **Burning**: Orange/red color, fire DoT damage
- **Poisoned**: Green color, poison DoT damage
- **Slowed/Frozen**: Cyan color, reduced movement speed

## Visual Indicators

- **Hit Flash**: White flash when damaged
- **Crit Flash**: Red flash when critically hit
- **Status Effects**: Color changes based on active effects
- **Damage Numbers**: Float upward showing damage dealt
- **Size Variation**: Different enemy types have different sizes

## Balance Considerations

- Sluggers have higher health but lower damage and speed
- Sluggers provide more XP to compensate for ranged difficulty
- Attack speed scaling makes later waves more challenging
- Spawn weights allow fine-tuning of enemy composition
- Exponential scaling ensures difficulty increases meaningfully each wave
