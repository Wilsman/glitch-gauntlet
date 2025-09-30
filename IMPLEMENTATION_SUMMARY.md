# Enemy Scaling System Implementation Summary

## Changes Made

### 1. Type Definitions (`shared/types.ts`)
- Added `EnemyType` union type: `'grunt' | 'slugger'`
- Updated `Enemy` interface with new properties:
  - `type: EnemyType` (changed from hardcoded 'grunt')
  - `speed: number` (required field for movement)
  - `attackCooldown?: number` (for shooting enemies)
  - `attackSpeed?: number` (time between shots)
  - `projectileSpeed?: number` (bullet velocity)

### 2. Enemy Configuration System (`worker/enemyConfig.ts`) - NEW FILE
Created a comprehensive enemy configuration system with:
- `EnemyConfig` interface defining all enemy properties and scaling
- `ENEMY_CONFIGS` object with configurations for each enemy type
- `createEnemy()` function that generates scaled enemies based on wave
- `selectRandomEnemyType()` function for weighted random enemy selection

**Enemy Types Implemented:**
- **Grunt**: Fast melee enemy with balanced scaling
- **Slugger**: Slower ranged enemy that shoots projectiles

### 3. Server-Side Game Logic (`worker/durableObject.ts`)
Updated enemy spawning and AI:
- Imported enemy configuration system
- Modified `updateEnemyAI()` to use `createEnemy()` and `selectRandomEnemyType()`
- Added shooting behavior for ranged enemies
- Updated movement to use enemy's `speed` property
- Integrated slow effect calculations
- Added enemy projectile generation logic

Updated projectile collision detection:
- Added check for enemy projectiles hitting players
- Enemy projectiles respect player armor, dodge, and shield
- Enemy projectiles are removed after hitting a player

### 4. Client-Side Rendering (`src/components/GameCanvas.tsx`)
Enhanced visual representation:
- Different colors for enemy types (yellow for grunt, orange for slugger)
- Different sizes for enemy types (20px for grunt, 24px for slugger)
- Red projectiles for enemy bullets
- Maintained status effect color overrides

## How It Works

### Scaling Formula
```typescript
scaled_stat = base_stat * (scaling_multiplier ^ (wave - 1))
```

Wave 1 has no scaling (multiplier^0 = 1), each subsequent wave applies exponential growth.

### Enemy Spawning
1. Check if spawn conditions are met (enemy count < max, random chance)
2. Select random enemy type based on spawn weights
3. Create enemy with scaled stats for current wave
4. Spawn at random position on top or bottom edge

### Enemy Behavior
- **Grunt**: Chases closest player, deals contact damage
- **Slugger**: Chases closest player but shoots projectiles from range (400px)

### Projectile System
- Enemy projectiles use the same `Projectile` type as player projectiles
- Distinguished by `ownerId` matching an enemy ID
- Red visual appearance for easy identification
- Hit detection against players with full defense calculations

## Extensibility

The system is designed for easy expansion:

1. **Add new enemy type**: Update `EnemyType` union and add config to `ENEMY_CONFIGS`
2. **Adjust balance**: Modify scaling multipliers in enemy configs
3. **Add special behaviors**: Extend `updateEnemyAI()` with type-specific logic
4. **Custom visuals**: Add rendering logic in `GameCanvas.tsx`

## Testing Recommendations

1. Start a game and observe enemy spawning
2. Progress through waves to verify scaling
3. Check that sluggers shoot projectiles
4. Verify enemy projectiles damage players
5. Test status effects on different enemy types
6. Confirm visual differences between enemy types

## Future Enhancement Ideas

- **Tank**: High health, slow, high damage melee
- **Sniper**: Very long range, high damage, low fire rate
- **Swarm**: Low health, very fast, spawns in groups
- **Elite**: Rare spawn with significantly higher stats
- **Boss**: Special enemy at certain waves with unique mechanics
