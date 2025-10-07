# Meta-Progression System Design

## Current State Analysis

### ✅ What We Have
- **Character Unlocks**: 4 locked characters (Pet Pal Percy, Vampire Vex, Turret Tina, Dash Dynamo)
- **Basic Stats Tracking**: 
  - Times reached level 10
  - Highest wave reached
  - Total games played
  - Total enemies killed
- **Last Run Stats**: Character used, wave reached, enemies killed, survival time, victory status
- **Leaderboard Integration**: Scores submitted to global leaderboard

### ❌ What's Missing
- No persistent currency/rewards
- No permanent upgrades between runs
- No mastery/progression per character
- No cosmetic unlocks
- No daily/weekly challenges
- No achievement system
- No prestige/endgame loop

---

## Meta-Progression Ideas

### 💎 Currency System: "Glitch Tokens"

**Earning Methods:**
```typescript
interface GlitchTokenRewards {
  perWaveCompleted: 10;        // 10 tokens per wave
  perEnemyKilled: 1;            // 1 token per kill
  perLevelUp: 5;                // 5 tokens per level
  firstTimeWaveBonus: 50;       // First time reaching each wave
  victoryBonus: 200;            // Win the game
  hellhoundRoundBonus: 100;     // Complete hellhound round
  noDeathBonus: 150;            // Complete wave without taking damage
  speedRunBonus: 100;           // Complete wave in under 10s
}
```

**Spending Options:**
- Permanent upgrades (see below)
- Character unlocks (alternative to achievement unlocks)
- Cosmetic items
- Starting loadouts
- Reroll tokens for upgrades

---

### 🎯 Permanent Upgrades (Account-Wide)

**Tier 1 - Foundation (50-100 tokens each)**
```typescript
const tier1Upgrades = [
  { id: 'hp_boost_1', name: 'Reinforced Armor I', effect: '+10 max HP', cost: 50 },
  { id: 'damage_boost_1', name: 'Weapon Training I', effect: '+5% damage', cost: 50 },
  { id: 'speed_boost_1', name: 'Sprint Shoes I', effect: '+5% movement speed', cost: 50 },
  { id: 'xp_boost_1', name: 'Experience Magnet I', effect: '+10% XP gain', cost: 75 },
  { id: 'pickup_boost_1', name: 'Vacuum Upgrade I', effect: '+10% pickup radius', cost: 50 },
  { id: 'starting_gold', name: 'Nest Egg', effect: 'Start with 50 bonus tokens', cost: 100 },
];
```

**Tier 2 - Enhancement (100-200 tokens each)**
```typescript
const tier2Upgrades = [
  { id: 'hp_boost_2', name: 'Reinforced Armor II', effect: '+20 max HP', cost: 150, requires: 'hp_boost_1' },
  { id: 'damage_boost_2', name: 'Weapon Training II', effect: '+10% damage', cost: 150, requires: 'damage_boost_1' },
  { id: 'crit_chance', name: 'Lucky Strike', effect: '+5% base crit chance', cost: 200 },
  { id: 'attack_speed', name: 'Rapid Fire', effect: '+10% attack speed', cost: 175 },
  { id: 'starting_upgrade', name: 'Head Start', effect: 'Start with 1 random common upgrade', cost: 200 },
  { id: 'reroll_token', name: 'Reroll Token', effect: 'Reroll upgrade choices once per run', cost: 150 },
];
```

**Tier 3 - Mastery (250-500 tokens each)**
```typescript
const tier3Upgrades = [
  { id: 'hp_boost_3', name: 'Reinforced Armor III', effect: '+30 max HP', cost: 300, requires: 'hp_boost_2' },
  { id: 'damage_boost_3', name: 'Weapon Training III', effect: '+15% damage', cost: 300, requires: 'damage_boost_2' },
  { id: 'second_life', name: 'Phoenix Down', effect: 'Revive once per run at 50% HP', cost: 500 },
  { id: 'starting_legendary', name: 'Legendary Cache', effect: 'Start with 1 random legendary upgrade', cost: 500 },
  { id: 'double_tokens', name: 'Token Doubler', effect: 'Earn 2x tokens from all sources', cost: 400 },
  { id: 'wave_skip', name: 'Time Warp', effect: 'Skip to wave 3 at start', cost: 350 },
];
```

---

### 🏆 Character Mastery System

**Per-Character Progression:**
```typescript
interface CharacterMastery {
  characterType: CharacterType;
  level: number;              // 1-50
  xp: number;                 // XP toward next level
  gamesPlayed: number;
  gamesWon: number;
  totalKills: number;
  highestWave: number;
  fastestVictoryTime: number;
  perks: CharacterPerk[];     // Unlocked at levels 5, 10, 15, 20, 25
}

interface CharacterPerk {
  level: number;
  name: string;
  description: string;
  effect: string;
}
```

**Example Perks (Spray 'n' Pray):**
```typescript
const sprayNPrayPerks = [
  { level: 5, name: 'Trigger Happy', effect: '+5% attack speed for this character' },
  { level: 10, name: 'Bullet Hose', effect: 'Start with +1 multishot' },
  { level: 15, name: 'Spray Master', effect: '+10% damage for this character' },
  { level: 20, name: 'Ammo Belt', effect: '+2 pierce on all shots' },
  { level: 25, name: 'Bullet Storm', effect: 'Every 10th shot fires 5 bullets in spread' },
];
```

**Mastery XP Earning:**
- 100 XP per wave completed
- 50 XP per enemy killed
- 500 XP for victory
- 200 XP for hellhound round completion

---

### 🎨 Cosmetic System

**Player Skins (Color Variations):**
```typescript
const playerSkins = [
  { id: 'default', name: 'Classic', color: '#00FFFF', cost: 0 },
  { id: 'crimson', name: 'Crimson Rage', color: '#FF0000', cost: 100 },
  { id: 'emerald', name: 'Emerald Dream', color: '#00FF00', cost: 100 },
  { id: 'gold', name: 'Golden God', color: '#FFD700', cost: 200 },
  { id: 'void', name: 'Void Walker', color: '#9D00FF', cost: 300 },
  { id: 'rainbow', name: 'Rainbow Dash', color: 'gradient', cost: 500 },
];
```

**Projectile Trails:**
```typescript
const projectileTrails = [
  { id: 'default', name: 'Standard', effect: 'none', cost: 0 },
  { id: 'fire', name: 'Flame Trail', effect: 'fire_particles', cost: 150 },
  { id: 'ice', name: 'Frost Trail', effect: 'ice_particles', cost: 150 },
  { id: 'lightning', name: 'Electric Trail', effect: 'lightning_particles', cost: 150 },
  { id: 'stars', name: 'Starlight', effect: 'star_particles', cost: 200 },
  { id: 'skulls', name: 'Death Trail', effect: 'skull_particles', cost: 300 },
];
```

**Death Animations:**
```typescript
const deathAnimations = [
  { id: 'default', name: 'Standard Fade', cost: 0 },
  { id: 'explosion', name: 'Explosive Exit', cost: 100 },
  { id: 'dissolve', name: 'Digital Dissolve', cost: 150 },
  { id: 'ascend', name: 'Heavenly Ascension', cost: 200 },
];
```

**Victory Emotes:**
```typescript
const victoryEmotes = [
  { id: 'default', name: 'Victory Pose', cost: 0 },
  { id: 'dance', name: 'Victory Dance', cost: 150 },
  { id: 'fireworks', name: 'Fireworks Show', cost: 200 },
  { id: 'confetti', name: 'Confetti Cannon', cost: 150 },
];
```

---

### 📜 Achievement System

**Combat Achievements:**
```typescript
const combatAchievements = [
  { id: 'first_blood', name: 'First Blood', desc: 'Kill your first enemy', reward: 50 },
  { id: 'centurion', name: 'Centurion', desc: 'Kill 100 enemies in one run', reward: 100 },
  { id: 'executioner', name: 'Executioner', desc: 'Kill 1000 total enemies', reward: 200 },
  { id: 'genocide', name: 'Genocide', desc: 'Kill 10,000 total enemies', reward: 500 },
  { id: 'crit_master', name: 'Critical Master', desc: 'Land 100 critical hits in one run', reward: 150 },
  { id: 'chain_reaction', name: 'Chain Reaction', desc: 'Chain lightning to 10+ enemies at once', reward: 200 },
  { id: 'explosive_expert', name: 'Explosive Expert', desc: 'Kill 50 enemies with explosions in one run', reward: 150 },
];
```

**Survival Achievements:**
```typescript
const survivalAchievements = [
  { id: 'survivor', name: 'Survivor', desc: 'Reach wave 5', reward: 100 },
  { id: 'veteran', name: 'Veteran', desc: 'Reach wave 10', reward: 200 },
  { id: 'legend', name: 'Legend', desc: 'Reach wave 20', reward: 500 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Complete a wave without taking damage', reward: 150 },
  { id: 'glass_cannon', name: 'True Glass Cannon', desc: 'Win with less than 10% HP remaining', reward: 300 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Complete wave 1-5 in under 2 minutes', reward: 250 },
];
```

**Character Achievements:**
```typescript
const characterAchievements = [
  { id: 'spray_master', name: 'Spray Master', desc: 'Win with Spray n Pray', reward: 100 },
  { id: 'boom_master', name: 'Boom Master', desc: 'Win with Boom Bringer', reward: 100 },
  { id: 'sniper_master', name: 'Sniper Master', desc: 'Win with Glass Cannon Carl', reward: 100 },
  { id: 'all_chars', name: 'Jack of All Trades', desc: 'Win with all characters', reward: 500 },
  { id: 'no_upgrades', name: 'Purist', desc: 'Win without selecting any upgrades', reward: 1000 },
];
```

**Special Achievements:**
```typescript
const specialAchievements = [
  { id: 'hellhound_hunter', name: 'Hellhound Hunter', desc: 'Complete 10 hellhound rounds', reward: 300 },
  { id: 'splitter_slayer', name: 'Splitter Slayer', desc: 'Kill 100 splitters', reward: 200 },
  { id: 'pet_lover', name: 'Pet Lover', desc: 'Have 5 pets at once', reward: 250 },
  { id: 'turret_engineer', name: 'Turret Engineer', desc: 'Place 100 turrets', reward: 200 },
  { id: 'vampire_lord', name: 'Vampire Lord', desc: 'Drain 10,000 HP as Vampire Vex', reward: 300 },
];
```

---

### 🎲 Daily/Weekly Challenges

**Daily Challenges (Refresh every 24h):**
```typescript
interface DailyChallenge {
  id: string;
  name: string;
  description: string;
  objective: ChallengeObjective;
  reward: number; // Glitch Tokens
  expiresAt: number; // Timestamp
}

const dailyChallengePool = [
  { name: 'Speed Run', desc: 'Complete 3 waves in under 1 minute', reward: 100 },
  { name: 'Sharpshooter', desc: 'Land 50 critical hits', reward: 75 },
  { name: 'Tank Mode', desc: 'Complete a wave with over 200 HP', reward: 100 },
  { name: 'Glass Cannon', desc: 'Win with under 50 max HP', reward: 150 },
  { name: 'Pacifist Run', desc: 'Complete wave 1 without attacking (pets/turrets only)', reward: 200 },
  { name: 'Elemental Master', desc: 'Apply 100 status effects', reward: 100 },
];
```

**Weekly Challenges (Refresh every 7 days):**
```typescript
const weeklyChallengePool = [
  { name: 'Marathon', desc: 'Reach wave 15', reward: 500 },
  { name: 'Genocide', desc: 'Kill 500 enemies', reward: 400 },
  { name: 'Character Master', desc: 'Win with 3 different characters', reward: 600 },
  { name: 'Perfectionist', desc: 'Win without dying once', reward: 750 },
  { name: 'Collector', desc: 'Collect 50 upgrades across all runs', reward: 500 },
];
```

---

### 🔄 Prestige System

**Prestige Levels:**
```typescript
interface PrestigeSystem {
  level: number;              // 0-10 (or infinite)
  tokensRequired: number;     // Cost to prestige
  benefits: PrestigeBenefit[];
}

const prestigeLevels = [
  { 
    level: 1, 
    cost: 5000, 
    benefits: [
      'Unlock "Prestige" border color (gold)',
      '+5% token gain permanently',
      'Unlock prestige-exclusive upgrades'
    ]
  },
  { 
    level: 2, 
    cost: 10000, 
    benefits: [
      '+10% token gain permanently',
      'Start each run with 1 random uncommon upgrade',
      'Unlock prestige skin variants'
    ]
  },
  { 
    level: 5, 
    cost: 50000, 
    benefits: [
      '+25% token gain permanently',
      'Start each run with 1 random legendary upgrade',
      'Unlock "Glitch God" title'
    ]
  },
];
```

**Prestige-Exclusive Upgrades:**
```typescript
const prestigeUpgrades = [
  { id: 'god_mode', name: 'God Mode', effect: 'Start with 200 HP, +50% damage', cost: 1000, prestigeRequired: 1 },
  { id: 'instant_level', name: 'Instant Gratification', effect: 'Start at level 5', cost: 1500, prestigeRequired: 2 },
  { id: 'legendary_start', name: 'Legendary Beginning', effect: 'Start with 3 legendary upgrades', cost: 2000, prestigeRequired: 3 },
];
```

---

### 🎁 Starting Loadouts

**Unlockable Starting Builds:**
```typescript
interface StartingLoadout {
  id: string;
  name: string;
  description: string;
  cost: number; // Glitch Tokens
  upgrades: UpgradeType[];
  stats?: StatModifiers;
}

const startingLoadouts = [
  {
    id: 'tank',
    name: 'Tank Build',
    desc: 'Start with defensive upgrades',
    cost: 300,
    upgrades: ['maxHealth', 'armor', 'regeneration'],
    stats: { maxHealth: +50, armor: 0.1 }
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon Build',
    desc: 'High damage, low survivability',
    cost: 300,
    upgrades: ['critChance', 'critDamage', 'projectileDamage'],
    stats: { maxHealth: -30, projectileDamage: +10 }
  },
  {
    id: 'elemental',
    name: 'Elemental Build',
    desc: 'Start with elemental effects',
    cost: 400,
    upgrades: ['fireDamage', 'iceSlow', 'poisonDamage'],
  },
  {
    id: 'support',
    name: 'Support Build',
    desc: 'Pets and turrets',
    cost: 500,
    upgrades: ['pet', 'turret', 'orbital'],
  },
];
```

---

### 📊 Profile & Statistics Page

**Profile Display:**
```typescript
interface PlayerProfile {
  // Identity
  playerName: string;
  prestigeLevel: number;
  totalPlaytime: number; // milliseconds
  accountCreated: number; // timestamp
  
  // Lifetime Stats
  totalGamesPlayed: number;
  totalVictories: number;
  totalDeaths: number;
  winRate: number; // percentage
  
  totalEnemiesKilled: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalXPCollected: number;
  totalUpgradesCollected: number;
  
  // Records
  highestWaveReached: number;
  fastestVictoryTime: number;
  mostKillsInRun: number;
  longestSurvivalTime: number;
  highestLevel: number;
  
  // Favorites
  favoriteCharacter: CharacterType;
  mostPlayedCharacter: CharacterType;
  mostSuccessfulCharacter: CharacterType;
  
  // Currency
  glitchTokens: number;
  lifetimeTokensEarned: number;
  lifetimeTokensSpent: number;
  
  // Collections
  unlockedCharacters: CharacterType[];
  unlockedAchievements: string[];
  unlockedCosmetics: string[];
  permanentUpgrades: string[];
  
  // Character Mastery
  characterMastery: Map<CharacterType, CharacterMastery>;
}
```

---

## Implementation Priority

### 🎯 Phase 1 - Foundation (Week 1)
1. **Glitch Token System**
   - Add token earning logic
   - Display tokens in UI
   - Save/load from localStorage
2. **Basic Permanent Upgrades**
   - Implement Tier 1 upgrades (HP, damage, speed)
   - Create upgrade shop UI
   - Apply upgrades at game start
3. **Achievement System**
   - Track basic achievements
   - Show achievement notifications
   - Award tokens for achievements

### 🎯 Phase 2 - Progression (Week 2)
4. **Character Mastery**
   - Track per-character stats
   - Implement mastery levels
   - Unlock character-specific perks
5. **Daily Challenges**
   - Generate daily challenges
   - Track challenge progress
   - Award bonus tokens
6. **Profile Page**
   - Display lifetime stats
   - Show achievement progress
   - Character mastery overview

### 🎯 Phase 3 - Polish (Week 3)
7. **Cosmetic System**
   - Player color skins
   - Projectile trails
   - Victory animations
8. **Starting Loadouts**
   - Predefined builds
   - Custom loadout creator
9. **Prestige System**
   - Prestige UI
   - Prestige benefits
   - Prestige-exclusive content

---

## Technical Implementation

### Data Structure Updates

**Add to `shared/types.ts`:**
```typescript
export interface MetaProgression {
  // Currency
  glitchTokens: number;
  lifetimeTokensEarned: number;
  
  // Permanent Upgrades
  permanentUpgrades: string[]; // IDs of purchased upgrades
  
  // Character Mastery
  characterMastery: Record<CharacterType, CharacterMastery>;
  
  // Achievements
  unlockedAchievements: string[];
  achievementProgress: Record<string, number>;
  
  // Challenges
  dailyChallenge?: DailyChallenge;
  dailyChallengeProgress: number;
  weeklyChallenges: WeeklyChallenge[];
  
  // Cosmetics
  unlockedCosmetics: string[];
  equippedCosmetics: {
    skin?: string;
    projectileTrail?: string;
    deathAnimation?: string;
    victoryEmote?: string;
  };
  
  // Prestige
  prestigeLevel: number;
  
  // Statistics
  lifetimeStats: LifetimeStats;
}

export interface CharacterMastery {
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
  totalKills: number;
  highestWave: number;
  unlockedPerks: number[];
}

export interface LifetimeStats {
  totalPlaytimeMs: number;
  totalGamesPlayed: number;
  totalVictories: number;
  totalDeaths: number;
  totalEnemiesKilled: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalXPCollected: number;
  totalUpgradesCollected: number;
  highestWaveReached: number;
  fastestVictoryTimeMs: number;
  mostKillsInRun: number;
}
```

### Token Earning Logic

**Add to `LocalGameEngine.ts`:**
```typescript
private calculateTokenReward(): number {
  const stats = this.getRunStats();
  let tokens = 0;
  
  // Base rewards
  tokens += stats.waveReached * 10;        // 10 per wave
  tokens += stats.enemiesKilled * 1;       // 1 per kill
  tokens += stats.levelReached * 5;        // 5 per level
  
  // Bonus rewards
  if (stats.isVictory) tokens += 200;      // Victory bonus
  if (stats.hellhoundRoundsCompleted > 0) {
    tokens += stats.hellhoundRoundsCompleted * 100;
  }
  
  // Multipliers
  const prestigeMultiplier = 1 + (getPrestigeLevel() * 0.05);
  tokens = Math.floor(tokens * prestigeMultiplier);
  
  return tokens;
}
```

---

## UI/UX Considerations

### New Menu Pages
1. **Profile Page** - View stats, achievements, mastery
2. **Shop Page** - Purchase permanent upgrades
3. **Cosmetics Page** - Equip skins and effects
4. **Challenges Page** - View daily/weekly challenges
5. **Prestige Page** - Prestige system info

### In-Game UI Updates
- **Token counter** in top-right corner
- **Achievement popup** when unlocked
- **Challenge progress** indicator
- **Mastery XP bar** for current character
- **Cosmetic effects** visible on player/projectiles

### Progression Feedback
- **Level up animation** for character mastery
- **Token gain popup** at end of run
- **Achievement unlock fanfare**
- **Challenge completion celebration**

---

## Balancing Considerations

### Token Economy
- Average run (wave 5 loss): ~100-150 tokens
- Good run (wave 10): ~300-400 tokens
- Victory run (wave 5+): ~500-700 tokens
- Daily challenge: +100 tokens
- Weekly challenge: +500 tokens

**Time to unlock major upgrades:**
- Tier 1 upgrade: 1-2 runs
- Tier 2 upgrade: 3-5 runs
- Tier 3 upgrade: 10-15 runs
- Character unlock: 5-10 runs
- Prestige: 50-100 runs

### Power Creep Management
- Permanent upgrades should feel impactful but not game-breaking
- Prestige resets should be optional, not required
- Character mastery perks should enhance playstyle, not trivialize content
- Starting loadouts should offer variety, not pure power

---

## Conclusion

This meta-progression system provides:
- ✅ **Short-term goals** (daily challenges, achievements)
- ✅ **Medium-term goals** (character mastery, permanent upgrades)
- ✅ **Long-term goals** (prestige, full collection)
- ✅ **Replayability** (different builds, challenges, characters)
- ✅ **Player expression** (cosmetics, loadouts)
- ✅ **Sense of progression** (always working toward something)

The system is designed to be **addictive but fair**, rewarding both skill and time investment without creating pay-to-win scenarios (since there's no monetization).
