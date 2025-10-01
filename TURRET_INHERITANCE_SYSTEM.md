# Turret Inheritance System

## Overview

Turrets now inherit most of the player's upgrades and stats, making them scale powerfully with your build!

---

## Inherited Stats & Upgrades

### ✅ Damage Scaling
- **Base Damage:** `8 + (player.level × 2)`
- **Bonus Damage:** Inherits player's `projectileDamage` upgrades
- **Formula:** `turretBaseDamage + (playerProjectileDamage - 8)`
- **Example:** If player has 50 damage, turret gets: `(8 + level×2) + (50 - 8) = base + 42 bonus`

### ✅ Critical Hits
- **Crit Chance:** Inherits player's `critChance` (0-1)
- **Crit Multiplier:** Inherits player's `critMultiplier` (e.g., 2x, 3x)
- **Calculation:** Each turret shot rolls for crit independently
- **Visual:** Turret crits show yellow projectiles just like player crits

### ✅ Pierce
- **Pierce Count:** Inherits player's `pierceCount`
- **Behavior:** Turret bullets pass through enemies
- **Synergy:** Works with pierce upgrades like "Piercing Shot"

### ✅ Ricochet
- **Ricochet Count:** Inherits player's `ricochetCount`
- **Behavior:** Turret bullets bounce to nearby enemies
- **Synergy:** Works with ricochet upgrades like "Ricochet"

### ✅ Multishot
- **Projectiles Per Shot:** Inherits player's `projectilesPerShot`
- **Spread:** 10° spread (same as player)
- **Behavior:** Turrets fire multiple projectiles in a spread pattern
- **Synergy:** Works with multishot upgrades like "Multi-Shot"
- **Example:** With 5 projectiles per shot, each turret fires 5 bullets per attack

### ✅ Elemental Effects
Turrets automatically apply all elemental effects because they use the player's ID as `ownerId`:

- **Fire Damage:** Burns enemies over time
- **Poison Damage:** Poisons enemies over time
- **Ice Slow:** Slows enemy movement speed

### ✅ Attack Speed
- **Scaling:** Turret attack speed = `player.attackSpeed × 1.5`
- **Minimum:** 300ms (capped to prevent too fast)
- **Example:** If player has 400ms attack speed, turret gets 600ms
- **Synergy:** Attack speed upgrades make turrets fire faster

---

## Fixed Turret Stats

These stats do NOT scale with player upgrades:

- **Health:** 50 HP (fixed)
- **Max Health:** 50 HP (fixed)
- **Range:** 300 units (fixed)
- **Duration:** 20 seconds (fixed)
- **Projectile Speed:** 8 units/tick (fixed, slower than player's 10)
- **Projectile Radius:** 5 (standard bullet size)
- **Max Turrets:** 3 active at once

---

## Upgrade Synergies

### Best Upgrades for Turret Tina

1. **Projectile Damage** ⭐⭐⭐
   - Directly increases turret damage
   - Stacks with level scaling

2. **Crit Chance + Crit Damage** ⭐⭐⭐
   - Turrets can crit independently
   - Multiplies total damage output

3. **Attack Speed** ⭐⭐⭐
   - Makes turrets fire 50% slower than you
   - More shots = more DPS

4. **Multi-Shot** ⭐⭐⭐
   - Turrets fire multiple projectiles per shot
   - Multiplies total damage output
   - Synergizes with pierce/ricochet

5. **Pierce** ⭐⭐
   - Turret bullets pass through enemies
   - Great for grouped enemies

6. **Ricochet** ⭐⭐
   - Turret bullets bounce to nearby targets
   - Excellent area coverage

7. **Elemental Effects** ⭐⭐
   - Fire: DoT damage
   - Poison: DoT damage
   - Ice: Slows enemies for easier targeting

8. **Chain Lightning** ⭐
   - Turret hits can trigger chain lightning
   - Inherited via ownerId

9. **Explosion Damage** ⭐
   - If you have explosion upgrades, turret hits may trigger them
   - Inherited via ownerId

---

## Build Examples

### Crit Turret Build
- Max Crit Chance (aim for 50%+)
- Max Crit Damage (3x-4x multiplier)
- Projectile Damage upgrades
- Attack Speed upgrades
- **Result:** Turrets become crit machines with high burst

### Pierce/Ricochet Build
- Max Pierce Count (3-5 enemies)
- Max Ricochet Count (3-5 bounces)
- Projectile Damage
- Attack Speed
- **Result:** Turrets clear entire groups efficiently

### Elemental Build
- Fire Damage
- Poison Damage
- Ice Slow
- Projectile Damage
- **Result:** Turrets apply multiple DoTs and CC

### Hybrid Build
- Balanced crit chance (30-40%)
- Some pierce (2-3)
- Fire or Poison
- Attack Speed
- **Result:** Well-rounded turrets for all situations

---

## Gameplay Tips

1. **Placement Matters**
   - Place turrets in choke points
   - Cover different angles for better coverage
   - Replace oldest turret strategically (3 max)

2. **Upgrade Priority**
   - Early: Projectile Damage + Attack Speed
   - Mid: Crit Chance + Pierce/Ricochet
   - Late: Crit Damage + Elemental Effects

3. **Synergy with Character**
   - Turret Tina has high HP (130) - tank while turrets DPS
   - Slow movement (3.2) - use turrets for zone control
   - Heavy cannon - personal DPS + turret DPS = massive output

4. **Turret Management**
   - Press E to place new turret
   - Watch timer (20 seconds)
   - Replace expiring turrets proactively
   - Position before waves start

---

## Technical Details

### Damage Calculation
```typescript
// Base turret damage
const baseDamage = 8 + (player.level * 2);

// Add player's bonus damage
const bonusDamage = player.projectileDamage - 8;
const totalBaseDamage = baseDamage + bonusDamage;

// Apply crit
const isCrit = Math.random() < player.critChance;
const finalDamage = totalBaseDamage * (isCrit ? player.critMultiplier : 1);
```

### Attack Speed Calculation
```typescript
// Turrets fire 50% slower than player
const turretAttackSpeed = Math.max(300, player.attackSpeed * 1.5);
```

### Inheritance Method
- Turret projectiles use `ownerId: player.id`
- Game engine looks up owner when projectile hits
- Owner's stats applied to damage calculation
- Owner's effects applied to enemy

---

## Balance Notes

### Why 50% Slower Attack Speed?
- Prevents turrets from being too powerful
- Maintains player as primary DPS source
- Still scales well with upgrades

### Why Fixed Health?
- Turrets are meant to be temporary
- Encourages strategic placement
- Can be destroyed by enemy projectiles

### Why 3 Max Turrets?
- Prevents screen clutter
- Encourages strategic replacement
- Balanced DPS output

---

## Future Enhancements

Potential improvements:
- Turret health scales with player max health
- Turret range scales with upgrades
- Different turret types (fast/slow/heavy)
- Turret repair mechanic
- Turret upgrade system
- Turret targeting priority

---

**Implementation Date:** 2025-10-01  
**Status:** ✅ Fully Implemented and Functional
