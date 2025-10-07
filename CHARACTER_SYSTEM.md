# Character System Documentation

## Overview

The game features 3 distinct playable characters, each with unique stats, weapon types, and playstyles. Players select their character before starting a game.

---

### Shortlist of characters

- Spray 'n' Pray
- Boom Bringer
- Glass Cannon Carl
- Pet Pal Percy
- Vampire Vex
- Turret Tina
- Dash Dynamo

---

## 🎮 Characters

### 1. Spray 'n' Pray 🔫 (Balanced)

**Playstyle:** Balanced rapid-fire DPS specialist

**Base Stats:**
- Health: 100
- Damage: 8
- Attack Speed: 300ms (3.33 shots/sec)
- Movement Speed: 4
- Crit Multiplier: 2x

**Weapon:** Rapid-Fire
- Standard projectiles
- High fire rate for consistent DPS
- Works with all upgrade modifiers

**Pros:**
- High fire rate = excellent on-hit item procs
- Balanced stats make it forgiving for new players
- Scales well with attack speed and multishot upgrades

**Cons:**
- Low individual damage per shot
- Needs upgrades to become powerful
- No built-in special mechanics

**Best Upgrades:**
- Attack Speed (maximize proc rate)
- Multi-Shot (more bullets = more procs)
- Crit Chance + Crit Damage
- Chain Lightning / Ricochet (proc on every hit)

---

### 2. Boom Bringer 💣 (AoE Specialist)

**Playstyle:** Explosive AoE damage dealer

**Base Stats:**
- Health: 120 (+20 more than balanced)
- Damage: 18 (+10 more than balanced)
- Attack Speed: 700ms (1.43 shots/sec)
- Movement Speed: 3.5 (slower)
- Crit Multiplier: 2x

**Weapon:** Grenade Launcher
- Fires grenades that explode on impact
- Built-in AoE explosion (60 radius, 50% damage splash)
- Slower projectile speed (7 vs 10)

**Pros:**
- Built-in AoE for crowd control
- Higher base health for survivability
- Safe distance combat
- Explosions hit multiple enemies automatically

**Cons:**
- Slow fire rate (poor for on-hit procs)
- Less effective against single tough enemies
- Slower movement makes dodging harder

**Best Upgrades:**
- Projectile Damage (amplifies both hit and explosion)
- Explosion Damage (stacks with built-in AoE)
- Pierce (grenade passes through enemies before exploding)
- Life Steal (sustain through AoE damage)

---

### 3. Glass Cannon Carl 🎯 (High Risk/High Reward)

**Playstyle:** Precision sniper with devastating single-shot damage

**Base Stats:**
- Health: 75 (-25 less than balanced)
- Damage: 35 (+27 more than balanced)
- Attack Speed: 900ms (1.11 shots/sec)
- Movement Speed: 4
- Crit Multiplier: 3x (highest in game!)

**Weapon:** Sniper Shot
- High damage single shots
- Very slow fire rate
- Standard projectile speed

**Pros:**
- Massive damage per shot
- 3x crit multiplier (vs 2x for others)
- Can one-shot weaker enemies
- Excellent with crit builds

**Cons:**
- Very low HP (75 vs 100/120)
- Extremely vulnerable to damage
- Slow fire rate = poor proc rate
- Requires good positioning and dodging

**Best Upgrades:**
- Max Health (compensate for low base HP)
- Crit Chance + Crit Damage (maximize burst)
- Dodge / Shield / Armor (survivability)
- Executioner (instant kill below 15% HP)
- Berserker (high damage when low HP)

---

## 🔧 Technical Implementation

### Type System

```typescript
export type CharacterType = 'spray-n-pray' | 'boom-bringer' | 'glass-cannon-carl';
export type WeaponType = 'rapid-fire' | 'grenade-launcher' | 'sniper-shot';
```

### Character Configuration

Located in `shared/characterConfig.ts`:
- Defines base stats for each character
- Exports helper functions to retrieve character data

### Weapon Behaviors

**Rapid-Fire (Spray 'n' Pray):**
- Standard bullet projectiles
- Velocity: 10 units/tick
- Radius: 5
- Works with all upgrade modifiers

**Grenade Launcher (Boom Bringer):**
- Slower projectiles (velocity: 7)
- Larger radius: 8
- On hit: Creates explosion (60 radius, 50% damage)
- Explosion damage affected by upgrade modifiers

**Sniper Shot (Glass Cannon Carl):**
- Standard bullet projectiles
- Same as rapid-fire but with higher base damage
- 3x crit multiplier instead of 2x

### Game Engine Integration

The `LocalGameEngine` constructor accepts a `CharacterType` parameter:

```typescript
constructor(playerId: string, characterType: CharacterType = 'spray-n-pray')
```

Character stats are applied during player initialization.

---

## 🎨 Visual Differentiation

### In-Game Indicators

Each character displays their emoji above their player circle:
- 🔫 Spray 'n' Pray
- 💣 Boom Bringer
- 🎯 Glass Cannon Carl

### Character Selection UI

- Full-screen modal on game start
- Grid layout showing all 3 characters
- Displays:
  - Character name and emoji
  - Base stats (HP, Damage, Fire Rate, Speed)
  - Description
  - Pros and cons
- Selected character highlighted with yellow glow

---

## 🎯 Balance Philosophy

**Spray 'n' Pray:** Jack-of-all-trades, scales with upgrades
- DPS: Medium (consistent)
- Survivability: Medium
- Skill Floor: Low
- Skill Ceiling: Medium

**Boom Bringer:** Tank with AoE focus
- DPS: Medium (burst AoE)
- Survivability: High
- Skill Floor: Low
- Skill Ceiling: Medium

**Glass Cannon Carl:** High risk, high reward sniper
- DPS: High (burst single-target)
- Survivability: Low
- Skill Floor: High
- Skill Ceiling: High

---

## 📊 DPS Calculations

**Spray 'n' Pray:**
- Base DPS: 8 damage × 3.33 shots/sec = 26.67 DPS

**Boom Bringer:**
- Base DPS: 18 damage × 1.43 shots/sec = 25.74 DPS
- With AoE: ~38.61 DPS (assuming explosion hits 1 additional enemy)

**Glass Cannon Carl:**
- Base DPS: 35 damage × 1.11 shots/sec = 38.85 DPS
- With crits (10% chance): ~42.74 DPS
- With crits (50% chance): ~58.33 DPS

---

## 🚀 Future Enhancements

Potential additions:
- More characters (melee, support, etc.)
- Character-specific ultimate abilities
- Character-specific upgrade pools
- Character skins/variants
- Character progression/unlocks

---

## 📝 Files Modified/Created

**Created:**
- `shared/characterConfig.ts` - Character definitions
- `src/components/CharacterSelect.tsx` - Selection UI

**Modified:**
- `shared/types.ts` - Added character types
- `src/lib/LocalGameEngine.ts` - Character initialization and weapon logic
- `src/pages/HomePage.tsx` - Character selection flow
- `src/pages/GamePage.tsx` - Pass character to engine
- `src/components/GameCanvas.tsx` - Character emoji display

---

**Last Updated:** 2025-09-30
