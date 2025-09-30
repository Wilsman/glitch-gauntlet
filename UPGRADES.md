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
- **Implementation**: ⚠️ Partially implemented (enemy AI)

---

### 🐾 Companion System

#### **pet** (Boss)
- **Alternative Names**: "Angry Chihuahua Familiar"
- **Effect**: Summon a companion that auto-attacks enemies
- **Details**:
  - Levels up automatically with player
  - Auto-attacks nearest enemy within 400 units
  - Stats scale: +10 HP, +2 damage, 5% faster attack speed per level
  - Follows player at 40 unit distance
  - Random emoji: 🐶🐱🐰🦊🐻🐼🐨🐯🦁🐸
- **Cap**: 1 pet (does not stack)
- **Stacks**: ❌ Single pet only
- **Visual**: Emoji-style animal with health bar
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
  - Fire trails deal DoT and apply burning status
  - Damage scales with player level: 10 + (level × 2)
  - Multiple skulls evenly spaced around player
- **Rarity**: 10% drop rate
- **Stacks**: ✅ Additive (+1 skull per stack)
- **Visual**: Flaming skull emoji (💀) with orange fire aura and trailing fire effects
- **Implementation**: ✅ Fully implemented

---

### 🚧 Not Yet Implemented

These upgrades are defined but need full implementation:

#### **invincibility** (Legendary)
- **Alternative Names**: "Plot Armor (Legendary)"
- **Effect**: Survive lethal damage once per wave
- **Rarity**: 10% drop rate
- **Implementation**: ❌ Not implemented

#### **clone** (Legendary)
- **Alternative Names**: "Sketchy Cloning Device", "Mirror Dimension Portal"
- **Effect**: Summon a clone that fights with you
- **Rarity**: 10% drop rate
- **Implementation**: ❌ Not implemented

#### **ghostBullets** (Lunar)
- **Alternative Names**: "Spectral Ammunition"
- **Effect**: Bullets phase through walls, +20% damage taken
- **Rarity**: 3% drop rate
- **Implementation**: ❌ Not implemented

#### **aura** (Boss)
- **Alternative Names**: "Intimidating Boss Music"
- **Effect**: Enemies near you deal 30% less damage
- **Rarity**: 5% drop rate
- **Implementation**: ❌ Not implemented

#### **turret** (Boss)
- **Alternative Names**: "Sentient Toaster Turret"
- **Effect**: Deploy a turret that shoots enemies
- **Rarity**: 5% drop rate
- **Implementation**: ❌ Not implemented

#### **reflect** (Boss)
- **Alternative Names**: "Uno Reverse Card (Laminated)"
- **Effect**: Reflect 50% of projectiles
- **Rarity**: 5% drop rate
- **Implementation**: ❌ Not implemented

#### **dash** (Boss)
- **Alternative Names**: "Anime Protagonist Dash"
- **Effect**: Dash through enemies
- **Rarity**: 5% drop rate
- **Implementation**: ❌ Not implemented

#### **doubleJump** (Boss)
- **Alternative Names**: None defined
- **Effect**: Double jump ability
- **Rarity**: 5% drop rate
- **Implementation**: ❌ Not implemented

---

## 📋 Quick Reference Table

| Upgrade | Type | Rarity | Drop % | Effect Summary | Stacks | Cap | Status |
|---------|------|--------|--------|----------------|--------|-----|--------|
| attackSpeed | Offensive | Common | 50% | 0.8x cooldown (20% faster) | ✅ | 60ms | ✅ |
| projectileDamage | Offensive | Common | 50% | +5 damage | ✅ | None | ✅ |
| critChance | Offensive | Common | 50% | +10% crit chance | ✅ | 75% | ✅ |
| critDamage | Offensive | Uncommon | 30% | +0.5x crit multiplier | ✅ | None | ✅ |
| multiShot | Offensive | Uncommon | 30% | +1 projectile | ✅ | 10 | ✅ |
| berserker | Offensive | Legendary | 10% | +50% dmg <30% HP | ✅ | None | ✅ |
| executioner | Offensive | Legendary | 10% | Instakill <15% HP | ✅ | None | ✅ |
| maxHealth | Defensive | Common | 50% | +20 max HP, heal 20 | ✅ | None | ✅ |
| armor | Defensive | Common | 50% | +5% dmg reduction | ✅ | 50% | ✅ |
| dodge | Defensive | Common | 50% | +5% dodge chance | ✅ | 30% | ✅ |
| regeneration | Defensive | Common | 50% | +1 HP/sec | ✅ | None | ✅ |
| shield | Defensive | Uncommon | 30% | +50 shield | ✅ | None | ✅ |
| thorns | Defensive | Uncommon | 30% | Reflect 20% dmg | ✅ | 50% | ✅ |
| playerSpeed | Movement | Common | 50% | 1.15x speed | ✅ | None | ✅ |
| pickupRadius | Movement | Common | 50% | 1.2x XP radius | ✅ | 120 | ✅ |
| magnetic | Movement | Common | 50% | 1.3x XP radius | ✅ | 150 | ✅ |
| lifeSteal | Healing | Uncommon | 30% | Heal 5% of dmg | ✅ | 50% | ✅ |
| vampiric | Healing | Uncommon | 30% | Heal 10% of dmg | ✅ | 50% | ✅ |
| fireDamage | Elemental | Void | 2% | 100% DoT over 2s | ✅ | None | ✅ |
| poisonDamage | Elemental | Void | 2% | 50% DoT over 3s | ✅ | None | ✅ |
| iceSlow | Elemental | Void | 2% | 40% slow for 2s | ✅ | 70% | ✅ |
| pierce | Projectile | Uncommon | 30% | +1 pierce | ✅ | None | ✅ |
| knockback | Projectile | Uncommon | 30% | +30 units pushback | ✅ | None | ✅ |
| explosion | Projectile | Legendary | 10% | 200% AoE on kill | ✅ | None | ✅ |
| bananarang | Projectile | Legendary | 10% | +1 returning banana | ✅ | 10 | ✅ |
| chain | Projectile | Uncommon | 30% | Chain to +2 enemies | ✅ | None | ✅ |
| ricochet | Projectile | Legendary | 10% | +3 bounces | ✅ | None | ✅ |
| homingShots | Projectile | Uncommon | 30% | +0.3 homing | ✅ | 1.0 | ✅ |
| lucky | Special | Legendary | 10% | Double all drops | ✅ | None | ✅ |
| timeWarp | Special | Legendary | 10% | 30% enemy slow | ✅ | None | ⚠️ |
| pet | Companion | Boss | 5% | Summon pet | ❌ | 1 | ✅ |
| orbital | Orbital | Legendary | 10% | Flaming skulls orbit | ✅ | None | ✅ |
| invincibility | Special | Legendary | 10% | Survive lethal 1x | ❌ | - | ❌ |
| clone | Special | Legendary | 10% | Fighting clone | ❌ | - | ❌ |
| ghostBullets | Special | Lunar | 3% | Phase walls +20% dmg | ❌ | - | ❌ |
| aura | Special | Boss | 5% | -30% enemy dmg | ❌ | - | ❌ |
| turret | Special | Boss | 5% | Deploy turret | ❌ | - | ❌ |
| reflect | Special | Boss | 5% | 50% projectile reflect | ❌ | - | ❌ |
| dash | Movement | Boss | 5% | Dash ability | ❌ | - | ❌ |
| doubleJump | Movement | Boss | 5% | Double jump | ❌ | - | ❌ |

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

### Total Upgrades: 39
- **Implemented**: 31 (79%)
- **Partially Implemented**: 1 (3%)
- **Not Implemented**: 7 (18%)

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
