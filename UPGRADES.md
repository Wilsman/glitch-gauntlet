# Upgrade System Documentation

This document provides a comprehensive overview of all upgrades in the game, their properties, mechanics, and visual effects.

---

## 🎯 Upgrade Categories & Drop Rates

- **Common (White)** - 50% drop rate - Basic stat improvements
- **Uncommon (Green)** - 30% drop rate - Stronger effects
- **Legendary (Red)** - 10% drop rate - Powerful game-changers
- **Boss (Yellow)** - 5% drop rate - Unique boss-themed items
- **Lunar (Blue)** - 3% drop rate - High risk/reward (not yet implemented)
- **Void (Purple)** - 2% drop rate - Corrupted versions

---

## 📊 Complete Upgrade List

### ⚔️ Offensive Stats

#### **attackSpeed** (Common)
- **Alternative Names**: "Caffeinated Hamster Wheel", "Twitchy Trigger Finger"
- **Effect**: Multiply attack speed by 0.8x (20% faster) per stack
- **Cap**: 60ms minimum cooldown
- **Stacks**: ✅ Multiplicative
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **projectileDamage** (Common)
- **Alternative Names**: "Angry Spicy Bullets", "Pointier Bullets"
- **Effect**: +5 damage per shot per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **critChance** (Common)
- **Alternative Names**: "Lucky Rabbit's Foot (Unlucky Rabbit)", "Four-Leaf Clover"
- **Effect**: +10% critical hit chance per stack
- **Cap**: 75% maximum
- **Stacks**: ✅ Additive
- **Visual**: Red damage numbers on crit
- **Implementation**: ✅ Fully implemented

#### **critDamage** (Uncommon)
- **Alternative Names**: "Oversized Novelty Hammer"
- **Effect**: +0.5x critical damage multiplier per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Larger red damage numbers
- **Implementation**: ✅ Fully implemented

#### **multiShot** (Uncommon)
- **Alternative Names**: "Two-For-One Tuesdays", "Shotgun Surgery"
- **Effect**: +1 projectile per shot per stack
- **Cap**: 10 projectiles maximum
- **Stacks**: ✅ Additive
- **Visual**: More bullets fired simultaneously
- **Implementation**: ✅ Fully implemented

#### **berserker** (Legendary/Lunar)
- **Alternative Names**: "Unhinged Gamer Rage", "Hulk Smash Mode", "Glass Cannon Syndrome" (Lunar)
- **Effect**: +50% damage when below 30% HP (Legendary), +100% damage -50% max HP (Lunar)
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Red pulsing glow when active
- **Implementation**: ✅ Fully implemented (damage calc)

#### **executioner** (Legendary)
- **Alternative Names**: "Guillotine Enthusiast Badge", "Finish Him! Achievement"
- **Effect**: Instant kill enemies below 15% HP
- **Cap**: None (threshold stacks)
- **Stacks**: ✅ Increases threshold
- **Visual**: Special kill effect
- **Implementation**: ✅ Fully implemented

---

### 🛡️ Defensive Stats

#### **maxHealth** (Common)
- **Alternative Names**: "Vitamin Gummies (Probably Safe)", "Suspicious Mushroom"
- **Effect**: +20 max HP and heal 20 HP per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **armor** (Common)
- **Alternative Names**: "Cardboard Box Armor", "Thick Skin (Metaphorically)"
- **Effect**: +5% damage reduction per stack
- **Cap**: 50% maximum
- **Stacks**: ✅ Additive
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **dodge** (Common)
- **Alternative Names**: "Banana Peel Shoes", "Slippery When Wet"
- **Effect**: +5% chance to avoid damage per stack
- **Cap**: 30% maximum
- **Stacks**: ✅ Additive
- **Visual**: Flash effect when dodge triggers
- **Implementation**: ✅ Fully implemented

#### **regeneration** (Common)
- **Alternative Names**: "Sketchy Energy Drink", "Band-Aid Collection"
- **Effect**: +1 HP per second passive healing per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **shield** (Uncommon)
- **Alternative Names**: "Bubble Wrap Force Field", "Inflatable Pool Toy"
- **Effect**: +50 shield points that absorb damage before HP per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Blue/cyan ring around player
- **Implementation**: ✅ Fully implemented

#### **thorns** (Uncommon)
- **Alternative Names**: "Porcupine Onesie", "Cactus Costume"
- **Effect**: Reflect 20% of damage taken back to attacker per stack
- **Cap**: 50% maximum
- **Stacks**: ✅ Additive
- **Visual**: None
- **Implementation**: ✅ Fully implemented

---

### 🏃 Movement & Utility

#### **playerSpeed** (Common)
- **Alternative Names**: "Greased Lightning Shoes", "Roller Skates"
- **Effect**: Multiply movement speed by 1.15x per stack
- **Cap**: None
- **Stacks**: ✅ Multiplicative
- **Visual**: None
- **Implementation**: ✅ Fully implemented

#### **pickupRadius** (Common)
- **Alternative Names**: "Industrial Shop-Vac"
- **Effect**: Multiply XP collection radius by 1.2x per stack
- **Cap**: 120 units maximum
- **Stacks**: ✅ Multiplicative
- **Visual**: Purple dashed circle
- **Implementation**: ✅ Fully implemented

#### **magnetic** (Common)
- **Alternative Names**: "Suspiciously Strong Magnet"
- **Effect**: Multiply XP collection radius by 1.3x per stack
- **Cap**: 150 units maximum
- **Stacks**: ✅ Multiplicative
- **Visual**: Purple dashed circle
- **Implementation**: ✅ Fully implemented

---

### 💉 Life Steal & Healing

#### **lifeSteal** (Uncommon)
- **Alternative Names**: "Thirsty Bullets"
- **Effect**: Heal 5% of damage dealt per stack
- **Cap**: 50% maximum
- **Stacks**: ✅ Additive
- **Visual**: Green flash on player when healing
- **Implementation**: ✅ Fully implemented

#### **vampiric** (Uncommon/Lunar)
- **Alternative Names**: "Discount Dracula Fangs", "Mosquito Swarm", "Vampire's Curse" (Lunar)
- **Effect**: Heal 10% of damage dealt per stack (Uncommon), 25% but stops regen (Lunar)
- **Cap**: 50% maximum
- **Stacks**: ✅ Additive
- **Visual**: Green flash on player when healing
- **Implementation**: ✅ Fully implemented

---

### 🔥 Elemental Effects

#### **fireDamage** (Void)
- **Alternative Names**: "Corrupted Flamethrower"
- **Effect**: Apply burning status dealing 100% of hit damage over 2 seconds
- **Duration**: 2 seconds
- **Cap**: None (stacks increase DoT)
- **Stacks**: ✅ Additive
- **Visual**: Orange/red glow on burning enemies
- **Implementation**: ✅ Fully implemented

#### **poisonDamage** (Void)
- **Alternative Names**: "Void-Touched Venom"
- **Effect**: Apply poison status dealing 50% of hit damage over 3 seconds
- **Duration**: 3 seconds
- **Cap**: None (stacks increase DoT)
- **Stacks**: ✅ Additive
- **Visual**: Green glow on poisoned enemies
- **Implementation**: ✅ Fully implemented

#### **iceSlow** (Void)
- **Alternative Names**: "Absolute Zero Brain Freeze"
- **Effect**: Slow enemy movement by 40% per stack
- **Duration**: 2 seconds
- **Cap**: 70% maximum slow
- **Stacks**: ✅ Additive
- **Visual**: Cyan/blue tint on slowed enemies
- **Implementation**: ✅ Fully implemented

---

### 💥 Projectile Modifiers

#### **pierce** (Uncommon)
- **Alternative Names**: "Armor-Piercing Toothpicks", "Kebab Skewer"
- **Effect**: Bullets pierce through +1 additional enemy per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Bullets pass through enemies
- **Implementation**: ✅ Fully implemented

#### **knockback** (Uncommon)
- **Alternative Names**: "Leaf Blower 9000", "Sneeze Cannon"
- **Effect**: Push enemies back 30 units per stack
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Enemies visibly pushed back
- **Implementation**: ✅ Fully implemented

#### **explosion** (Legendary/Void)
- **Alternative Names**: "Pocket Nuke (Totally Safe)", "Michael Bay Director's Cut", "Void Implosion" (Void)
- **Effect**: Enemies explode on death dealing 200% of their max HP as AoE damage per stack
- **Radius**: 80 units
- **Cap**: None
- **Stacks**: ✅ Multiplicative
- **Visual**: Expanding orange circle (Legendary), black hole effect (Void)
- **Implementation**: ✅ Fully implemented

#### **bananarang** (Legendary)
- **Alternative Names**: "Bananarang"
- **Effect**: First pick unlocks returning banana projectile, subsequent picks add +1 banana
- **Cap**: 10 bananas maximum
- **Stacks**: ✅ Additive
- **Visual**: Yellow spinning banana that returns to player
- **Implementation**: ✅ Fully implemented

#### **chain** (Uncommon/Void)
- **Alternative Names**: "Sketchy Extension Cord", "Social Butterfly Effect", "Corrupted Lightning" (Void)
- **Effect**: Attacks chain to +2 nearby enemies per stack (Uncommon), +5 enemies at 50% damage (Void)
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Yellow jagged lightning bolts between enemies
- **Implementation**: ✅ Fully implemented

#### **ricochet** (Legendary)
- **Alternative Names**: "Pinball Wizard Certification", "Boomerang Physics Degree"
- **Effect**: Bullets bounce +3 times per stack, seeking nearest enemy after each bounce
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Magenta bullets that curve toward targets
- **Implementation**: ✅ Fully implemented

#### **homingShots** (Uncommon)
- **Alternative Names**: "GPS-Guided Freedom Seeds", "Bloodhound Bullets"
- **Effect**: +0.3 homing strength per stack (bullets curve toward enemies within 300 units)
- **Cap**: 1.0 maximum homing strength
- **Stacks**: ✅ Additive
- **Visual**: Cyan bullets that curve toward enemies
- **Implementation**: ✅ Fully implemented

---

### 🎲 Special Effects

#### **lucky** (Legendary/Lunar)
- **Alternative Names**: "Suspiciously Lucky Coin", "Horseshoe Up Your...", "Cursed Lottery Ticket" (Lunar)
- **Effect**: Double all drops (Legendary), Triple XP but enemies have +50% HP (Lunar)
- **Cap**: None
- **Stacks**: ✅ Multiplicative
- **Visual**: None
- **Implementation**: ✅ Fully implemented (XP/drop logic)

#### **timeWarp** (Legendary/Lunar)
- **Alternative Names**: "Microwave Time Machine", "Lag Switch (Legal)", "Broken Stopwatch" (Lunar)
- **Effect**: Slow enemies by 30% (Legendary), Player +50% speed, enemies +25% speed (Lunar)
- **Cap**: None
- **Stacks**: ✅ Additive
- **Visual**: Slow-motion effect
- **Implementation**: ✅ Fully implemented

---

### 🐾 Companion System

#### **pet** (Boss)
- **Alternative Names**: "Miniature Dachshund Defender"
- **Effect**: Summon a companion that auto-attacks enemies
- **Details**:
  - Levels up automatically with player
  - Auto-attacks nearest enemy within 400 units
  - Stats scale: +10 HP, +2 damage, 5% faster attack speed per level
  - Follows player at 40 unit distance
  - Includes specific "Dachshund Dan" synergy
- **Cap**: 1 pet (does not stack)
- **Stacks**: ❌ Single pet only
- **Visual**: Emoji-style animal with health bar (Miniature Dachshund 🐕)
- **Implementation**: ✅ Fully implemented

---

### 🔥 Orbital & Summons

#### **orbital** (Legendary)
- **Alternative Names**: "Flaming Skull Halo", "Infernal Skull Ring"
- **Effect**: Summon flaming skulls that orbit you, dealing damage on contact and leaving fire trails that burn enemies
- **Details**:
  - Each skull orbits at 60 units from player
  - Skulls deal direct damage on contact
  - Leaves fire trails that persist for 2 seconds
- **Rarity**: 10% drop rate
- **Stacks**: ✅ Additive (+1 skull per stack)
- **Visual**: Flaming skull emoji (💀) with orange fire aura
- **Implementation**: ✅ Fully implemented

#### **satelliteRing** (Boss)
- **Alternative Names**: "Saturn's Jewelry Collection"
- **Effect**: Four orbs of pure energy orbit you, striking enemies they touch
- **Details**:
  - Orbs rotate at a fixed radius (80 units)
  - Deals high damage on contact
  - Provides a mix of offense and defense
- **Visual**: Four glowing energy orbs in different colors
- **Implementation**: ✅ Fully implemented

---

### 🌀 Creative & Reality-Bending

#### **screenWrap** (Common)
- **Alternative Names**: "Pac-Man Physics Diploma"
- **Effect**: Screen edges wrap around; players and bullets reappear on the opposite side
- **Visual**: Subtle grid-line glow at arena edges
- **Implementation**: ✅ Fully implemented

#### **prismShards** (Legendary)
- **Alternative Names**: "Disco Ball Ammunition"
- **Effect**: Projectiles split into 3 small rainbow shards upon hitting an enemy
- **Visual**: Rainbow cycling bullet shards
- **Implementation**: ✅ Fully implemented

#### **neonTrail** (Uncommon)
- **Alternative Names**: "TRON Legacy Bootleg"
- **Effect**: Leave a glowing neon trail behind you that damages enemies
- **Visual**: Fading cyan trail segments
- **Implementation**: ✅ Fully implemented

#### **staticField** (Uncommon)
- **Alternative Names**: "Wool Socks on Carpet"
- **Effect**: Periodically release a blue electrical zap at the nearest enemy
- **Visual**: Jagged blue lightning arcs
- **Implementation**: ✅ Fully implemented

#### **growthRay** (Legendary)
- **Alternative Names**: "Compensating for Something?"
- **Effect**: Projectiles grow larger and deal more damage the further they travel
- **Visual**: Projectile radius increases over time
- **Implementation**: ✅ Fully implemented

#### **binaryRain** (Lunar)
- **Alternative Names**: "The Matrix Reloaded (Lo-Fi)"
- **Effect**: Enemies occasionally drop '0' bits (healing) or '1' bits (damage buff)
- **Visual**: Floating binary digits over the battlefield
- **Implementation**: ✅ Fully implemented

#### **echoShots** (Legendary)
- **Alternative Names**: "Double Tap (Literally)"
- **Effect**: Every primary shot is followed by a spectral 'echo' bullet 200ms later
- **Visual**: Ghostly 50% opacity trail bullet
- **Implementation**: ✅ Fully implemented

#### **gravityBullets** (Void)
- **Alternative Names**: "Event Horizon in a Box"
- **Effect**: Bullets exert a subtle gravitational pull on nearby enemies
- **Visual**: Purple swirling rings around projectiles
- **Implementation**: ✅ Fully implemented

#### **glitchPatch** (Boss)
- **Alternative Names**: "System Recovery Tool"
- **Effect**: Dealing damage has a chance to heal the player for 1 HP
- **Visual**: Green glitch pixel effect on player
- **Implementation**: ✅ Fully implemented

---

### 💎 High-Tier Legendaries

#### **omniGlitch** (Legendary)
- **Effect**: Infinite piercing; bullets leave a trail of glitch destruction
- **Implementation**: ✅ Fully implemented

#### **systemOverload** (Legendary)
- **Effect**: Using your active ability deletes all non-boss enemies
- **Implementation**: ✅ Fully implemented

#### **godMode** (Legendary)
- **Effect**: Become invulnerable for 5 seconds when at 1 HP (60s cooldown)
- **Implementation**: ✅ Fully implemented

---

### 🛡️ Boss & Advanced Upgrades

#### **invincibility** (Legendary)
- **Alternative Names**: "Plot Armor"
- **Effect**: Survive lethal damage once per wave
- **Implementation**: ✅ Fully implemented

#### **clone** (Legendary)
- **Alternative Names**: "Sketchy Cloning Device"
- **Effect**: Leave behind fighting afterimage clones as you move
- **Implementation**: ✅ Fully implemented

#### **ghostBullets** (Lunar)
- **Alternative Names**: "Spectral Ammunition"
- **Effect**: Bullets phase through arena walls
- **Implementation**: ✅ Fully implemented

#### **aura** (Boss)
- **Alternative Names**: "Intimidating Boss Music"
- **Effect**: Enemies near you deal 30% less damage
- **Implementation**: ✅ Fully implemented

#### **turret** (Boss)
- **Alternative Names**: "Sentient Toaster Turret"
- **Effect**: Deploy auto-firing turrets that target enemies
- **Implementation**: ✅ Fully implemented

#### **reflect** (Boss)
- **Alternative Names**: "Uno Reverse Card"
- **Effect**: 50% chance to reflect enemy projectiles back at them
- **Implementation**: ✅ Fully implemented

#### **dash** (Boss)
- **Alternative Names**: "Anime Protagonist Dash"
- **Effect**: Grants the ability to dash through groups of enemies
- **Implementation**: ✅ Fully implemented

#### **doubleJump** (Boss)
- **Alternative Names**: None defined
- **Effect**: Grants an extra jump in mid-air
- **Implementation**: ✅ Fully implemented

---

## 📋 Quick Reference Table

| Upgrade | Type | Rarity | Effect Summary | Status |
|---------|------|--------|----------------|--------|
| attackSpeed | Offensive | Common | 20% faster fire rate | ✅ |
| projectileDamage | Offensive | Common | +5 base damage | ✅ |
| critChance | Offensive | Common | +10% crit chance | ✅ |
| critDamage | Offensive | Uncommon | +0.5x crit multiplier | ✅ |
| multiShot | Offensive | Uncommon | +1 projectile | ✅ |
| berserker | Offensive | Legendary | +50% dmg <30% HP | ✅ |
| maxHealth | Defensive | Common | +20 max HP, heal 20 | ✅ |
| armor | Defensive | Common | +5% dmg reduction | ✅ |
| dodge | Defensive | Common | +5% dodge chance | ✅ |
| regeneration | Defensive | Common | +1 HP/sec | ✅ |
| shield | Defensive | Uncommon | +50 shield | ✅ |
| thorns | Defensive | Uncommon | Reflect 20% dmg | ✅ |
| playerSpeed | Movement | Common | 1.15x speed | ✅ |
| pickupRadius | Movement | Common | 1.3x XP radius | ✅ |
| lifeSteal | Healing | Uncommon | Heal 5% of dmg | ✅ |
| fireDamage | Elemental | Void | 100% DoT over 2s | ✅ |
| poisonDamage | Elemental | Void | 50% DoT over 3s | ✅ |
| iceSlow | Elemental | Void | 40% slow for 2s | ✅ |
| pierce | Projectile | Uncommon | +1 pierce | ✅ |
| knockback | Projectile | Uncommon | Heavy pushback | ✅ |
| explosion | Projectile | Legendary | 200% AoE on kill | ✅ |
| bananarang | Projectile | Legendary | Returning projectile | ✅ |
| chain | Projectile | Uncommon | Link attacks | ✅ |
| ricochet | Projectile | Legendary | Bouncing bullets | ✅ |
| homingShots | Projectile | Uncommon | Seeking bullets | ✅ |
| lucky | Special | Legendary | Double all drops | ✅ |
| timeWarp | Special | Legendary | Slow enemies | ✅ |
| pet | Companion | Boss | Battle companion | ✅ |
| orbital | Orbital | Legendary | Flaming skulls | ✅ |
| clone | Special | Legendary | Afterimage clones | ✅ |
| satelliteRing | Boss | Boss | Orbiting energy orbs | ✅ |
| screenWrap | Utility | Common | Edge wrapping | ✅ |
| prismShards | Projectile | Legendary | Split bullets on hit | ✅ |
| neonTrail | Movement | Uncommon | Damaging trail | ✅ |
| staticField | Utility | Uncommon | Periodic zaps | ✅ |
| growthRay | Projectile | Legendary | Scaling projectile size | ✅ |
| binaryRain | Special | Lunar | Buff drops on death | ✅ |
| echoShots | Offensive | Legendary | Delayed extra shots | ✅ |
| gravityBullets | Projectile | Void | Pull enemies toward bullets | ✅ |
| glitchPatch | Healing | Boss | Heal on hit | ✅ |

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
- **Knockback**: +30 units per stack
- **Shield**: +50 per stack
- **Regeneration**: +1 HP/sec per stack

### Multiplicative Stacking
- **Attack Speed**: 0.8x per stack (faster)
- **Movement Speed**: 1.15x per stack
- **Pickup Radius**: 1.2x per stack (pickupRadius) or 1.3x (magnetic)
- **Explosion Damage**: 2.0x per stack (200% per stack)

### Percentage Stacking (Capped)
- **Crit Chance**: +10% per stack (max 75%)
- **Armor**: +5% per stack (max 50%)
- **Dodge**: +5% per stack (max 30%)
- **Life Steal**: +5% per stack (max 50%)
- **Vampiric**: +10% per stack (max 50%)
- **Thorns**: +20% per stack (max 50%)
- **Ice Slow**: +40% per stack (max 70%)
- **Homing**: +0.3 per stack (max 1.0)

### Special Stacking
- **Bananarang**: First pick unlocks, subsequent picks add +1 banana (max 10)
- **Pet**: Does not stack (single pet only)
- **Lucky**: Multiplicative (2x per stack)
- **Crit Multiplier**: Additive (+0.5x per stack, no cap)

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
| Chain Lightning | Yellow | #FFFF00 |
| Ricochet | Magenta | #FF00FF |
| Homing | Cyan | #00CCFF |
| Bananarang | Yellow | #FFD700 |

---

## 🎮 Gameplay Tips

### Synergies

**Glass Cannon Build**
- Berserker + Max Health + Regeneration
- Stay at low HP for massive damage boost
- High risk, high reward playstyle

**Tank Build**
- Armor + Shield + Thorns + Regeneration
- Reflect damage while staying alive
- Survive extended fights

**DoT Build**
- Fire + Poison + Pierce + Chain
- Spread status effects to many enemies
- Excellent for crowd control

**Crit Build**
- Crit Chance + Crit Damage + Multi Shot + Attack Speed
- Massive burst damage
- Shred single targets quickly

**Speed Build**
- Attack Speed + Movement Speed + Multi Shot
- Overwhelming firepower
- Kite enemies effectively

**AoE Explosion Build**
- Explosion + Pierce + Chain + Multi Shot
- Chain reactions of death
- Clear entire waves instantly

**Homing/Ricochet Build**
- Homing Shots + Ricochet + Pierce
- Never miss a shot
- Excellent against mobile enemies

---

## 📊 Upgrade Statistics

### Total Upgrades: 49
- **Implemented**: 100%
- **Status**: Stable

### By Rarity:
- **Common**: 10 upgrades (50% drop rate)
- **Uncommon**: 10 upgrades (30% drop rate)
- **Legendary**: 10 upgrades (10% drop rate)
- **Boss**: 6 upgrades (5% drop rate)
- **Lunar**: 5 upgrades (3% drop rate) - Not implemented
- **Void**: 5 upgrades (2% drop rate)

### By Category:
- **Offensive**: 7 upgrades
- **Defensive**: 6 upgrades
- **Movement**: 5 upgrades
- **Projectile Modifiers**: 8 upgrades
- **Elemental**: 3 upgrades
- **Healing**: 2 upgrades
- **Special**: 7 upgrades
- **Companion**: 1 upgrade

---

## 📝 Update History

- **2025-10-05**: Clone (Afterimage) implementation
  - **Clone (Afterimage)**: Fully implemented afterimage clone system that spawns fighting clones as you move. Clones are stationary turrets that last 4 seconds, deal 30% of your damage, and fade in/out smoothly. Each stack reduces spawn cooldown by 0.5s. Features ghostly purple visual effects with semi-transparent character emojis.
  - Updated statistics: 32 implemented (82%), 6 not implemented (15%)

- **2025-09-30**: Complete documentation overhaul & Orbital implementation
  - Added comprehensive upgrade details with all alternative names
  - Added quick reference table with all stats
  - Added drop rates and implementation status for all upgrades
  - Documented all 39 upgrades in the game (31 implemented, 1 partial, 7 planned)
  - Added upgrade statistics section
  - Expanded synergy builds section
  - Added visual effect color reference
  - **Orbital (Flaming Skull Halo)**: Fully implemented with rotating flaming skulls that leave fire trails, deal contact damage, and apply burning status effects. Features beautiful visual effects with pulsing fire auras and skull emojis.

- **2025-09-29**: Initial documentation created
  - All basic offensive, defensive, and elemental upgrades implemented
  - Pierce, knockback, shield, armor, dodge, regeneration, thorns, berserker, executioner fully functional
  - Fire, poison, ice, and explosion visual effects complete
  - **Chain Lightning**: Implemented with jagged yellow lightning bolts between enemies (70% damage per chain)
  - **Ricochet**: Implemented with magenta bullets that seek nearest enemy after each bounce
  - **Homing Shots**: Implemented with cyan bullets that curve toward enemies within 300 units
  - **Pet System**: Fully implemented with emoji-style companions, auto-leveling, auto-attack AI, and dedicated stats panel

---

**⚠️ IMPORTANT**: This document must be updated whenever upgrades are added, removed, or modified!
