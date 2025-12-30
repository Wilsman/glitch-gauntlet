# Character System Documentation

## Overview

The game features 7 distinct playable characters, each with unique stats, weapon types, and playstyles. Players select their character before starting a game.

---

### Shortlist of characters

- Spray 'n' Pray
- Boom Bringer
- Glass Cannon Carl
- Dachshund Dan
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
- Ability: **Overclock** (50% fire rate boost for 4s)

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

---

### 2. Boom Bringer 💣 (AoE Specialist)

**Playstyle:** Explosive AoE damage dealer

**Base Stats:**
- Health: 120
- Damage: 18
- Attack Speed: 700ms (1.43 shots/sec)
- Movement Speed: 3.5
- Ability: **Cluster Bomb** (Ring of 8 explosives)

**Weapon:** Grenade Launcher
- Fires grenades that explode on impact
- Built-in AoE explosion (60 radius, 50% damage splash)
- Slower projectile speed (7 vs 10)

**Pros:**
- Built-in AoE for crowd control
- Higher base health for survivability
- Safe distance combat

**Cons:**
- Slow fire rate (poor for on-hit procs)
- Slower movement makes dodging harder

---

### 3. Glass Cannon Carl 🎯 (High Risk/High Reward)

**Playstyle:** Precision sniper with devastating single-shot damage

**Base Stats:**
- Health: 75
- Damage: 35
- Attack Speed: 900ms (1.11 shots/sec)
- Movement Speed: 4
- Ability: **Deadly Focus** (Next 3 shots are 100% crit & pierce)

**Weapon:** Sniper Shot
- High damage single shots
- Very slow fire rate
- 3x crit multiplier (highest in game!)

**Pros:**
- Massive damage per shot
- Incredible burst potential
- Excellent with crit builds

**Cons:**
- Very low HP (vulnerable to one-shots)
- Slow fire rate = poor proc rate

---

### 4. Dachshund Dan 🐕 (Companion Specialist)

**Playstyle:** High-mobility fighter with a loyal companion

**Base Stats:**
- Health: 90
- Damage: 10
- Attack Speed: 450ms
- Movement Speed: 4.2
- Ability: **Best Friend** (Dachshund goes into frenzy and heals you)

**Weapon:** Rapid-Fire
- Balanced output
- Faster movement speed than standard characters

**Pros:**
- Starts with a **Miniature Dachshund** pet for passive DPS
- Faster base movement speed
- Good sustain via companion ability

**Cons:**
- Lower base HP
- DPS relies partly on companion AI

---

### 5. Vampire Vex 🧛 (Sustain)

**Playstyle:** Aggressive sustain with life-drain aura

**Base Stats:**
- Health: 85
- Damage: 12
- Attack Speed: 600ms
- Movement Speed: 3.8
- Ability: **Blood Feast** (Heal 50 HP + Double drain radius)

**Weapon:** Burst-Fire
- Fires in 3-round bursts
- Excellent for stacking status effects

**Pros:**
- Passive AoE drain aura heals you constantly
- Drain radius grows with player level
- High survivability in crowds

**Cons:**
- Low base HP
- Drain radius starts very small

---

### 6. Turret Tina 🏗️ (Defense Builder)

**Playstyle:** Strategic builder focused on stationary defense

**Base Stats:**
- Health: 130
- Damage: 8
- Attack Speed: 800ms
- Movement Speed: 3.2
- Ability: **Mega Deploy** (Instantly deploys 3 advanced turrets)

**Weapon:** Heavy Cannon
- Large, high-impact projectiles
- Slow personal fire rate

**Pros:**
- Highest base health in the game
- Can deploy multiple auto-firing turrets
- Controls large areas easily

**Cons:**
- Very slow movement
- Relies heavily on stationary turrets

---

### 7. Dash Dynamo ⚡ (Speedster)

**Playstyle:** Hyper-mobile hit-and-run specialist

**Base Stats:**
- Health: 70
- Damage: 15
- Attack Speed: 500ms
- Movement Speed: 5.5
- Ability: **Overdrive** (Invulnerability + Double speed)

**Weapon:** Shotgun
- High damage at close range
- Short weapon range

**Pros:**
- Fastest character in the game
- Built-in **Blink Dash** for dodging
- High close-range burst damage

**Cons:**
- Fragile (lowest HP in game)
- High risk due to short range

---

## 🔧 Technical Implementation

### Type System

```typescript
export type CharacterType = 'spray-n-pray' | 'boom-bringer' | 'glass-cannon-carl' | 'pet-pal-percy' | 'vampire-vex' | 'turret-tina' | 'dash-dynamo';
export type WeaponType = 'rapid-fire' | 'grenade-launcher' | 'sniper-shot' | 'burst-fire' | 'heavy-cannon' | 'shotgun';
```

### Character Configuration

Located in `shared/characterConfig.ts`:
- Defines base stats for each character
- Exports `getCharacter` and `getAllCharacters` helpers

### Game Engine Integration

The `LocalGameEngine` constructor applies character stats during player initialization.

---

## � Visual Differentiation

### In-Game Indicators

Each character displays their emoji:
- 🔫 Spray 'n' Pray
- 💣 Boom Bringer
- 🎯 Glass Cannon Carl
- 🐕 Dachshund Dan
- 🧛 Vampire Vex
- 🏗️ Turret Tina
- ⚡ Dash Dynamo

---

## 📊 DPS Calculations (Base)

- **Spray 'n' Pray:** ~26.7 DPS (Balanced)
- **Boom Bringer:** ~25.7 DPS (Single) / ~38.6 DPS (AoE)
- **Glass Cannon Carl:** ~38.9 DPS (Standard) / ~58.3 DPS (Max Crits)
- **Dachshund Dan:** ~22.2 DPS + Companion DPS
- **Vampire Vex:** ~20.0 DPS + Drain Sustain
- **Turret Tina:** ~10.0 DPS + Turret DPS
- **Dash Dynamo:** ~30.0 DPS (Close Range)

---

## 🚀 Future Enhancements

- Melee-focused characters
- Support/Buffer characters
- Character-specific upgrade pools
- Progression/Unlocks (Wave reached, total kills, etc.)

---

## 📝 Files Modified/Created

- `shared/characterConfig.ts` - All stats
- `shared/types.ts` - New types and weapon categories
- `src/components/CharacterSelect.tsx` - Selection UI with 7 slots
- `src/lib/LocalGameEngine.ts` - Ability and weapon logic

---

**Last Updated:** 2025-12-23
