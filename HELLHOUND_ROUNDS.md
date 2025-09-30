# Hellhound Rounds System

## Overview
Inspired by Call of Duty Zombies, hellhound rounds are special event rounds that occur periodically, providing a break from normal gameplay and rewarding players with legendary upgrades.

## How It Works

### Trigger Conditions
- **First Hellhound Round**: Wave 5
- **Frequency**: Every 5 waves after that (waves 5, 10, 15, 20, etc.)
- **Formula**: `wave >= 5 && (wave - 5) % 5 === 0`

### Hellhound Round Mechanics

#### 1. Round Start
- All normal enemy spawning stops
- Screen dims with 40% black overlay for moody atmosphere
- "🐺 HELLHOUND ROUND 🐺" text appears at top
- Kill counter shows progress: "X / Y Killed"

#### 2. Hellhound Spawning
- **Total Hellhounds**: Scales with wave number
  - Formula: `min(24, 8 + (wave - 5) * 2)`
  - Wave 5: 8 hellhounds
  - Wave 10: 18 hellhounds
  - Wave 15: 24 hellhounds (capped)
- **Pack Spawning**: Hellhounds spawn in packs of 3-5
  - Random pack size each wave
  - All dogs in a pack spawn from the same side
  - Pack members spread out slightly for dramatic effect
- **Spawn Delays**: 3-5 seconds between each pack
  - Creates tension and breathing room
  - First pack spawns immediately when round starts
  - Random delay (3000-5000ms) between subsequent packs
- **Spawn Locations**: Random edges (top, bottom, left, right)
  - Entire pack comes from same direction
  - Spread out along the edge for visual variety

#### 3. Hellhound Stats
- **Base Health**: 40 (higher than grunt/slugger)
- **Base Damage**: 8 (high melee damage)
- **Base Speed**: 4.0 (very fast, 2x faster than grunts)
- **Base XP**: 15 (rewarding)
- **Scaling per Wave**:
  - Health: +35% per wave
  - Damage: +25% per wave
  - Speed: +5% per wave (faster than other enemies)
  - XP: +30% per wave
- **Behavior**: Melee only, aggressive chase, pack mentality
- **Visual**: 🐕 Dog emoji with wiggle animation on dark red glow background
  - Emoji rotates/wiggles as they run for dynamic feel
  - Dark red (#8B0000) circle background with red shadow glow

#### 4. Round Completion
- When all hellhounds are killed:
  - "🎉 Hellhound round complete!" message
  - **All alive players** get a legendary upgrade choice
  - Players cycle through upgrade selection
  - After all players choose, advance to next wave
  - Normal enemy spawning resumes

### Legendary Upgrade Reward
- Players get 3 legendary upgrade options to choose from
- Only legendary rarity upgrades are offered
- This is a significant power spike opportunity
- Encourages survival and teamwork

## Visual Indicators

### During Hellhound Round
1. **Dim Overlay**: 40% opacity black rectangle over entire arena
2. **Title Text**: "🐺 HELLHOUND ROUND 🐺" in red with glow effect
3. **Kill Counter**: "X / Y Killed" showing progress
4. **Enemy Appearance**: Dark red hellhounds with red shadow glow

### Hellhound Visual Design
- **Emoji**: 🐕 Dog emoji (24px font size)
- **Animation**: Wiggle/rotation effect while moving
  - Rotation formula: `Math.sin(time / 100 + position.x) * 15`
  - Creates unique wiggle for each dog based on position
- **Background**: Dark red (#8B0000) circle
- **Shadow**: Bright red (#FF0000) glow with 18px blur
- **Size**: 22px radius circle
- **Effect**: Emoji appears to "run" with wiggling motion

## Strategy Tips

### For Players
- **Kiting**: Hellhounds are fast - use movement upgrades
- **AoE Damage**: Explosion, chain lightning, and pierce upgrades shine
- **Crowd Control**: Ice slow and knockback help manage swarms
- **Positioning**: Use arena space to avoid being surrounded
- **Teamwork**: Revive fallen teammates to maximize legendary rewards

### Difficulty Curve
- **Early Rounds** (5, 10): Manageable with basic upgrades
- **Mid Rounds** (15, 20): Requires good build and positioning
- **Late Rounds** (25+): Intense challenge, capped at 24 hellhounds

## Technical Implementation

### Server-Side (`worker/durableObject.ts`)
- `HELLHOUND_ROUND_START = 5`: First hellhound round
- `HELLHOUND_ROUND_INTERVAL = 5`: Rounds between hellhound rounds
- `isHellhoundRound`: Boolean flag in GameState
- `hellhoundsKilled`: Counter for tracking progress
- `totalHellhoundsInRound`: Total hellhounds for this round
- `hellhoundRoundComplete`: Flag for reward phase

### Client-Side (`src/components/GameCanvas.tsx`)
- Dim overlay rendering
- Hellhound round indicator text
- Kill counter display
- Hellhound visual rendering

### Enemy Configuration (`worker/enemyConfig.ts`)
- Hellhound config with `spawnWeight: 0` (never spawns normally)
- High speed and damage stats
- Aggressive scaling

## Configuration

### Adjusting Difficulty
```typescript
// In worker/durableObject.ts
const HELLHOUND_ROUND_INTERVAL = 5; // Change frequency
const HELLHOUND_ROUND_START = 5; // Change first occurrence

// In updateWaves()
state.totalHellhoundsInRound = Math.min(24, 8 + (state.wave - HELLHOUND_ROUND_START) * 2);
// Adjust formula: min(cap, base + (wave - start) * multiplier)
```

### Adjusting Rewards
```typescript
// In updateWaves()
const legendaryUpgrades = getRandomUpgrades(3, 'legendary');
// Change count (3) or rarity ('legendary')
```

### Adjusting Hellhound Stats
```typescript
// In worker/enemyConfig.ts
hellhound: {
  baseHealth: 40,      // Adjust starting health
  baseDamage: 8,       // Adjust starting damage
  baseSpeed: 3.5,      // Adjust movement speed
  healthScaling: 1.35, // Adjust health growth
  // ... etc
}
```

## Future Enhancements

### Potential Additions
1. **Boss Hellhound**: Larger, tougher hellhound that spawns last
2. **Hellhound Variants**: Different types with unique abilities
3. **Sound Effects**: Growl/howl when hellhounds spawn
4. **Particle Effects**: Fire/smoke effects on hellhounds
5. **Teleport Animation**: Flash effect when hellhounds spawn
6. **Round Music**: Special music track for hellhound rounds
7. **Bonus XP**: Extra XP multiplier during hellhound rounds
8. **Time Bonus**: Faster completion = better rewards

### Balancing Considerations
- Monitor player survival rates during hellhound rounds
- Adjust spawn rates if too overwhelming
- Consider reducing concurrent spawns for solo players
- May need to cap hellhound speed at higher waves
- Legendary rewards may need cooldown to prevent power creep
