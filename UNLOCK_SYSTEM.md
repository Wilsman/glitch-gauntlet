# Character Unlock System Documentation

## Overview

The game features a progression-based unlock system where players can unlock new characters by completing achievements. Currently, **Pet Pal Percy** is the first unlockable character.

---

## 🎮 Unlockable Characters

### Pet Pal Percy 🐾 (UNLOCKABLE)

**Unlock Requirement:** Reach level 10 in 3 different games

**Base Stats:**
- Health: 90
- Damage: 10
- Attack Speed: 450ms (2.22 shots/sec)
- Movement Speed: 4.2
- Crit Multiplier: 2x

**Special Feature:** Starts with a pet companion from wave 1

**Weapon:** Rapid-Fire (standard)

**Pros:**
- Starts with a loyal pet companion
- Pet provides extra DPS from the beginning
- Pet scales with player level automatically
- Two sources of damage (player + pet)

**Cons:**
- Slightly lower base HP (90 vs 100)
- Requires unlocking (reach level 10 three times)
- Medium fire rate (not as fast as Spray 'n' Pray)

---

## 🔓 Unlock System Architecture

### Progression Storage (`src/lib/progressionStorage.ts`)

**Storage Method:** localStorage (persists across sessions)

**Storage Key:** `glitch-gauntlet-progression`

**Data Structure:**
```typescript
interface PlayerProgression {
  timesReachedLevel10: number;      // Count of level 10 achievements
  unlockedCharacters: CharacterType[]; // Array of unlocked character types
  highestWaveReached: number;        // Best wave performance
  totalGamesPlayed: number;          // Total games started
  totalEnemiesKilled: number;        // Lifetime enemy kills
  lastUpdated: number;               // Timestamp
}
```

**Default Unlocked Characters:**
- Spray 'n' Pray
- Boom Bringer
- Glass Cannon Carl

### Unlock Criteria Types

```typescript
type UnlockCriteriaType = 'level10Count' | 'waveReached' | 'gamesPlayed';

interface UnlockCriteria {
  type: UnlockCriteriaType;
  required: number;
  description: string;
}
```

**Current Criteria:**
- `level10Count`: Track how many times player reached level 10
- `waveReached`: Track highest wave reached (for future unlocks)
- `gamesPlayed`: Track total games played (for future unlocks)

---

## 🎯 How It Works

### 1. Level 10 Tracking

When a player reaches level 10 in a game:

1. `LocalGameEngine` detects level up to 10
2. Checks if this player already counted this game (prevents multiple counts)
3. Calls `incrementLevel10Count()` to update localStorage
4. Calls `checkUnlocks()` to see if any characters should unlock
5. If character unlocks, triggers callback to show notification

**Code Location:** `src/lib/LocalGameEngine.ts` → `updateXPOrbs()`

```typescript
if (p.level === 10 && !this.level10Tracked.has(p.id)) {
  this.level10Tracked.add(p.id);
  incrementLevel10Count();
  
  const newlyUnlocked = checkUnlocks();
  if (newlyUnlocked.length > 0 && this.onUnlock) {
    newlyUnlocked.forEach(charType => this.onUnlock!(charType));
  }
}
```

### 2. Character Selection UI

**Carousel Layout:**
- Shows 1.5 characters at a time (current + partial next)
- Navigation arrows (left/right)
- Dot indicators for position
- Smooth scroll animations

**Locked Character Display:**
- Grayscale filter
- Reduced opacity (0.6)
- Lock icon 🔒 overlay
- "LOCKED" badge
- Stats visible but grayed out

**Hover Tooltip:**
- Follows mouse cursor
- Shows unlock criteria
- Shows progress (e.g., "2/3 times reached level 10")
- Only appears on locked characters

### 3. Unlock Notification

When a character unlocks:

1. Full-screen celebration overlay
2. "CHARACTER UNLOCKED!" message
3. Character card with emoji and details
4. Animated entrance (scale + rotate)
5. Toast notification in-game
6. Auto-dismisses after 4 seconds

**Components:**
- `UnlockNotification.tsx` - Full-screen celebration
- Toast notification - In-game alert

---

## 📁 File Structure

### New Files Created

1. **`src/lib/progressionStorage.ts`**
   - Progression persistence layer
   - localStorage read/write
   - Unlock checking logic

2. **`src/components/UnlockTooltip.tsx`**
   - Mouse-following tooltip
   - Shows unlock progress
   - Displays criteria description

3. **`src/components/UnlockNotification.tsx`**
   - Full-screen unlock celebration
   - Animated character reveal
   - Click to dismiss

### Modified Files

1. **`shared/types.ts`**
   - Added `pet-pal-percy` to CharacterType
   - Added UnlockCriteria interface
   - Added PlayerProgression interface
   - Added unlock-related fields to CharacterStats

2. **`shared/characterConfig.ts`**
   - Added Pet Pal Percy character definition
   - Added unlock criteria to character config

3. **`src/lib/LocalGameEngine.ts`**
   - Level 10 tracking in updateXPOrbs()
   - Unlock callback system
   - Pet spawning for Pet Pal Percy

4. **`src/components/CharacterSelect.tsx`**
   - Converted grid to carousel layout
   - Added locked character handling
   - Added hover tooltip integration
   - Added navigation arrows and dots

5. **`src/pages/HomePage.tsx`**
   - Added UnlockNotification component
   - State management for unlocked characters

6. **`src/pages/GamePage.tsx`**
   - Set unlock callback on engine
   - Toast notification on unlock

7. **`src/components/GameCanvas.tsx`**
   - Added Pet Pal Percy emoji (🐾)

---

## 🎨 Visual Design

### Carousel

- **Width:** Each card is 66.666% of container width
- **Gap:** 1.5rem between cards
- **Transform:** Smooth translateX animation
- **Duration:** 500ms ease-out
- **Navigation:** Chevron buttons on sides
- **Indicators:** Dot navigation below carousel

### Locked Character

- **Filter:** `grayscale` CSS filter
- **Opacity:** 0.6
- **Border:** Gray (#666)
- **Overlay:** Semi-transparent black with lock icon
- **Cursor:** `not-allowed`

### Unlock Tooltip

- **Position:** Fixed, follows mouse (+20px offset)
- **Background:** Black with yellow border
- **Shadow:** Neon yellow glow
- **Progress Bar:** Gradient cyan to yellow
- **Animation:** Fade in/out

### Unlock Notification

- **Background:** Black/80 overlay
- **Card:** Black with yellow border
- **Glow:** Animated gradient border (yellow/pink/cyan)
- **Emoji:** 8xl size with bounce animation
- **Duration:** 4 seconds auto-dismiss

---

## 🔧 API Reference

### progressionStorage.ts

```typescript
// Load progression from localStorage
getProgression(): PlayerProgression

// Save progression to localStorage
saveProgression(progression: PlayerProgression): void

// Update specific fields
updateProgression(updates: Partial<PlayerProgression>): PlayerProgression

// Increment level 10 counter
incrementLevel10Count(): PlayerProgression

// Check if character is unlocked
isCharacterUnlocked(characterType: CharacterType): boolean

// Unlock a character
unlockCharacter(characterType: CharacterType): PlayerProgression

// Check for new unlocks based on current progression
checkUnlocks(): CharacterType[]

// Get unlock progress for a character
getUnlockProgress(characterType: CharacterType): { current: number; required: number } | null

// Reset all progression (for testing)
resetProgression(): void

// Record game end stats
recordGameEnd(wave: number, enemiesKilled: number): void
```

### LocalGameEngine

```typescript
// Set callback for when character unlocks
setOnUnlockCallback(callback: (characterType: CharacterType) => void): void
```

---

## 🚀 Future Extensibility

### Adding New Unlock Criteria

1. Add new type to `UnlockCriteriaType` in `types.ts`
2. Track new stat in `PlayerProgression` interface
3. Add tracking logic in appropriate location
4. Add check in `checkUnlocks()` function

**Example: Wave-based unlock**

```typescript
// In types.ts
type UnlockCriteriaType = 'level10Count' | 'waveReached' | 'gamesPlayed';

// In characterConfig.ts
unlockCriteria: {
  type: 'waveReached',
  required: 10,
  description: 'Reach wave 10 in any game',
}

// In progressionStorage.ts checkUnlocks()
if (
  progression.highestWaveReached >= 10 &&
  !progression.unlockedCharacters.includes('new-character')
) {
  unlockCharacter('new-character');
  newlyUnlocked.push('new-character');
}
```

### Adding New Characters

1. Add character type to `CharacterType` union
2. Define character in `CHARACTERS` object
3. Set `locked: true` and define `unlockCriteria`
4. Add emoji to GameCanvas character mapping
5. Add unlock check logic if using new criteria type

---

## 🎮 Player Experience Flow

### First Time Player

1. Opens character select
2. Sees 3 unlocked characters + partial view of locked Pet Pal Percy
3. Hovers over locked character
4. Tooltip: "🔒 Reach level 10 in 3 games (0/3)"
5. Selects available character and plays

### Progressing Player

1. Reaches level 10 in first game
2. Toast: "Progress: 1/3 Level 10 achievements!"
3. Returns to character select
4. Tooltip now shows: "🔒 Reach level 10 in 3 games (1/3)"
5. Continues playing

### Unlocking Moment

1. Reaches level 10 in third game
2. Full-screen unlock notification appears
3. "PET PAL PERCY UNLOCKED! 🐾"
4. Character card animates in with celebration
5. Toast notification: "🎉 Character Unlocked: Pet Pal Percy!"
6. Returns to character select
7. Pet Pal Percy now selectable
8. Starts game with pet companion

---

## 🐛 Testing

### Manual Testing

**Test Unlock Progression:**
```typescript
// In browser console
import { incrementLevel10Count, getProgression } from './progressionStorage';

// Manually increment
incrementLevel10Count();
incrementLevel10Count();
incrementLevel10Count();

// Check progression
console.log(getProgression());
```

**Reset Progression:**
```typescript
import { resetProgression } from './progressionStorage';
resetProgression();
```

**Force Unlock:**
```typescript
import { unlockCharacter } from './progressionStorage';
unlockCharacter('pet-pal-percy');
```

### Test Scenarios

1. ✅ Level 10 only counts once per game
2. ✅ Progress persists across page refreshes
3. ✅ Locked character shows tooltip on hover
4. ✅ Unlock notification appears when criteria met
5. ✅ Unlocked character becomes selectable
6. ✅ Pet Pal Percy starts with pet companion
7. ✅ Carousel navigation works smoothly
8. ✅ Partial visibility of locked character invites exploration

---

## 📊 Analytics Opportunities

Future tracking possibilities:
- Which characters are most popular?
- How long does it take to unlock Pet Pal Percy?
- Do players try new characters after unlocking?
- Unlock rate vs player retention

---

## ⚠️ Known Limitations

1. **LocalStorage Only:** Progress lost if localStorage cleared
2. **Single Player:** No cloud sync across devices
3. **No Backup:** Can't recover lost progress
4. **Cheat Vulnerable:** Players can edit localStorage (acceptable for single-player)

---

## 🎯 Success Metrics

- **Curiosity:** Partial visibility of locked character
- **Progression:** Clear progress tracking (X/3)
- **Reward:** Satisfying unlock celebration
- **Retention:** Reason to keep playing
- **Variety:** New playstyle to try

---

**Last Updated:** 2025-09-30
