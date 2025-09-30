# Enemy Stats by Wave

## Grunt Stats Progression

| Wave | Health | Damage | Speed | XP | Notes |
|------|--------|--------|-------|-----|-------|
| 1 | 20 | 5 | 2.00 | 5 | Base stats |
| 2 | 26 | 6 | 2.10 | 6 | +30% health |
| 3 | 34 | 7 | 2.21 | 7 | Noticeable speed increase |
| 4 | 44 | 9 | 2.32 | 8 | Damage becomes threatening |
| 5 | 57 | 10 | 2.43 | 9 | Final wave before teleporter |
| 10 | 206 | 26 | 2.89 | 15 | Extreme difficulty |

## Slugger Stats Progression

| Wave | Health | Damage | Speed | XP | Attack Speed (ms) | Proj Speed | Notes |
|------|--------|--------|-------|-----|-------------------|------------|-------|
| 1 | 30 | 3 | 1.20 | 8 | 2500 | 4.00 | Base stats |
| 2 | 42 | 3 | 1.24 | 10 | 2375 | 4.00 | Shoots faster |
| 3 | 59 | 4 | 1.27 | 12 | 2256 | 4.00 | Health scaling kicks in |
| 4 | 82 | 4 | 1.31 | 14 | 2143 | 4.00 | Tankier ranged threat |
| 5 | 115 | 5 | 1.35 | 17 | 2036 | 4.00 | Final wave |
| 10 | 510 | 7 | 1.51 | 33 | 1547 | 4.00 | Very tanky, rapid fire |

## Key Observations

### Grunt (Melee)
- **Strengths**: Fast movement, decent damage scaling
- **Weaknesses**: Must get close to deal damage
- **Threat Level**: Increases with wave due to speed + damage combo
- **Counter Strategy**: Kiting, knockback, ice slow

### Slugger (Ranged)
- **Strengths**: High health, ranged attacks, doesn't need to close distance
- **Weaknesses**: Slow movement, lower damage per hit
- **Threat Level**: Becomes very dangerous in groups at higher waves
- **Counter Strategy**: Dodge, armor, shield, focus fire

## Spawn Rates

With spawn weights:
- **Grunt**: 1.0 (62.5% of spawns)
- **Slugger**: 0.6 (37.5% of spawns)

Expected composition in a typical wave:
- 10 enemies: ~6 Grunts, ~4 Sluggers
- 20 enemies: ~13 Grunts, ~7 Sluggers

## Damage Per Second (DPS) Comparison

### Wave 1
- **Grunt**: 5 DPS (contact damage)
- **Slugger**: 1.2 DPS (3 damage every 2.5s)

### Wave 5
- **Grunt**: 10 DPS (contact damage)
- **Slugger**: 2.5 DPS (5 damage every 2.0s)

### Wave 10
- **Grunt**: 26 DPS (contact damage)
- **Slugger**: 4.5 DPS (7 damage every 1.5s)

**Note**: Grunt DPS assumes constant contact, which is unrealistic. Sluggers can maintain DPS from range, making them more consistent threats.

## Effective Health Pool (EHP)

Considering player needs to deal this much damage to kill:

### Wave 1
- **Grunt**: 20 HP
- **Slugger**: 30 HP (+50% more)

### Wave 5
- **Grunt**: 57 HP
- **Slugger**: 115 HP (+102% more)

### Wave 10
- **Grunt**: 206 HP
- **Slugger**: 510 HP (+148% more)

Sluggers become significantly tankier at higher waves due to their higher health scaling (1.4x vs 1.3x).

## Recommended Player Upgrades by Wave

### Early Game (Waves 1-2)
- Attack Speed
- Projectile Damage
- Movement Speed

### Mid Game (Waves 3-4)
- Multi-shot (handle multiple enemies)
- Pierce (deal with groups)
- Armor/Dodge (survive slugger projectiles)

### Late Game (Wave 5+)
- Crit Chance + Crit Damage
- Life Steal
- Explosion/Chain (AoE damage)
- Shield (absorb slugger projectiles)
