# Shared Game Logic Architecture

## Single Source of Truth

All game logic now lives in the `shared/` directory and is used by **both** game modes:

```
shared/
├── types.ts           # Type definitions (Player, Enemy, GameState, etc.)
├── upgrades.ts        # All upgrade definitions and selection logic
├── upgradeEffects.ts  # Upgrade effect application
└── enemyConfig.ts     # Enemy stats, scaling, and spawning logic
```

## How Both Modes Use Shared Code

### Worker (Host Mode - Multiplayer)
```typescript
// worker/durableObject.ts
import { getRandomUpgrades } from '@shared/upgrades';
import { applyUpgradeEffect } from '@shared/upgradeEffects';
import { createEnemy, selectRandomEnemyType } from '@shared/enemyConfig';
```

### Client (Local Mode - Single Player)
```typescript
// src/lib/LocalGameEngine.ts
import { getRandomUpgrades } from '@shared/upgrades';
import { applyUpgradeEffect } from '@shared/upgradeEffects';
import { createEnemy, selectRandomEnemyType } from '@shared/enemyConfig';
```

## Benefits

### ✅ Single Place to Add Content
When you want to add a new enemy or upgrade:
1. Edit the file in `shared/`
2. Both modes automatically use it
3. No duplication, no sync issues

### ✅ Type Safety
TypeScript ensures both modes use the same interfaces and types.

### ✅ Guaranteed Consistency
Impossible for local and host modes to have different game logic.

### ✅ Easy Testing
Test the shared logic once, works everywhere.

## Example: Adding a New Enemy

**Before (with duplication):**
```typescript
// Had to edit BOTH files:
// 1. worker/enemyConfig.ts
// 2. src/lib/enemyConfig-client.ts
```

**After (single source):**
```typescript
// Edit ONLY ONE file:
// shared/enemyConfig.ts

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  // ... existing enemies ...
  
  newEnemy: {
    type: 'newEnemy',
    baseHealth: 50,
    baseDamage: 10,
    baseSpeed: 3.0,
    baseXpValue: 20,
    healthScaling: 1.4,
    damageScaling: 1.3,
    speedScaling: 1.05,
    xpScaling: 1.25,
    spawnWeight: 0.5,
  },
};
```

✅ Both local and host modes now spawn this enemy!

## Example: Adding a New Upgrade

**Edit only `shared/upgrades.ts`:**
```typescript
export const ALL_UPGRADES: Omit<UpgradeOption, 'id'>[] = [
  // ... existing upgrades ...
  
  { 
    type: 'newUpgrade', 
    title: 'Cool New Upgrade', 
    description: 'Does something awesome!', 
    rarity: 'legendary', 
    emoji: '🚀' 
  },
];
```

**Then add effect in `shared/upgradeEffects.ts`:**
```typescript
export function applyUpgradeEffect(player: Player, upgradeType: UpgradeType): void {
  switch (upgradeType) {
    // ... existing cases ...
    
    case 'newUpgrade':
      player.someNewStat = (player.someNewStat || 0) + 1;
      break;
  }
}
```

✅ Both modes now have this upgrade!

## Path Aliases

The `@shared/` path alias works in both environments:
- **Worker**: Configured in `tsconfig.worker.json`
- **Client**: Configured in `tsconfig.json` and `vite.config.ts`

## No More Duplication

Previously had duplicate files:
- ❌ `worker/upgrades.ts` + `src/lib/upgrades-client.ts`
- ❌ `worker/upgradeEffects.ts` + `src/lib/upgradeEffects-client.ts`
- ❌ `worker/enemyConfig.ts` + `src/lib/enemyConfig-client.ts`

Now have single files:
- ✅ `shared/upgrades.ts` (used by both)
- ✅ `shared/upgradeEffects.ts` (used by both)
- ✅ `shared/enemyConfig.ts` (used by both)

## Development Workflow

1. **Add enemy**: Edit `shared/enemyConfig.ts`
2. **Add upgrade**: Edit `shared/upgrades.ts` and `shared/upgradeEffects.ts`
3. **Change game balance**: Edit the shared files
4. **Both modes update automatically** ✨

No need to remember to update multiple files!
