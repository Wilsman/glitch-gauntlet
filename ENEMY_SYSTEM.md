# Enemy System

## Overview

The current roster is built around readable combat jobs instead of raw stat inflation alone.
The core question for each enemy is "what movement or target-priority mistake does this punish?"

Current regular enemies:

- `grunt`: baseline melee pressure
- `slugger`: ranged standoff + strafing pressure
- `hellhound`: pack rush pressure during special rounds
- `splitter`: death-triggered target-priority pressure
- `mini-splitter`: cleanup swarm pressure
- `glitch-spider`: latch / panic-response pressure
- `neon-pulse`: area-denial pressure
- `tank-bot`: telegraphed disruption / knockback pressure

## Live Roster

### 1. Grunt

- Role: baseline chaser
- Behavior: runs straight at the closest living player and deals contact damage
- Strength: simple, reliable pressure that scales cleanly with wave number
- Counterplay: kite, slow, knock back, or delete quickly

### 2. Slugger

- Role: ranged flanker
- Behavior: maintains a preferred range, strafes laterally, and fires projectiles
- Signature: no longer just walks directly at the player; it slides across sightlines and punishes standing still
- Counterplay: close distance, dodge laterally, or force it out of its comfort range

### 3. Hellhound

- Role: coordinated rush threat
- Behavior: appears in hellhound rounds as 3-5 dog packs
- Signature: each pack promotes one alpha hound; nearby packmates accelerate and collapse from offset angles around the marked player
- Counterplay: kill the alpha first or break the pack before it surrounds the player

### 4. Splitter

- Role: death-punish enemy
- Behavior: medium melee chaser that splits into 2-3 mini-splitters on death
- Signature: changes kill priority because deleting it in the wrong place creates immediate cleanup pressure
- Counterplay: clear nearby trash first, then burst it where you have room

### 5. Mini-Splitter

- Role: fast follow-up threat
- Behavior: small melee offspring spawned only by splitters and some boss attacks
- Signature: low health, fast approach, never splits again
- Counterplay: sweep with AoE, pierce, or fast tracking shots

### 6. Glitch-Spider

- Role: panic / execution check
- Behavior: very fast chaser that latches onto the player on contact
- Signature: forces the facehugger shake-break interaction instead of normal damage pressure
- Counterplay: keep distance, slow it, or react quickly to break free

### 7. Neon Pulse

- Role: area denial
- Behavior: skirmishes at mid-range, fires projectiles, then telegraphs a pulse burst
- Signature: after the pulse resolves it leaves a temporary `pulse-zone` hazard that damages and nudges players standing inside it
- Counterplay: step out during the telegraph, then route around the unsafe ground instead of greedily holding position

### 8. Tank Bot

- Role: formation breaker
- Behavior: slow advance followed by a clear charge telegraph and a short rush
- Signature: the charge shoves players out of position and breaks "walk backward forever" kiting
- Counterplay: respect the lane, sidestep the telegraph, then punish recovery

## Spawn Rules

### Normal Waves

- Spawn chance scales with wave:
  - `0.05 + wave * 0.01`, capped at `0.95`
- Concurrent enemy cap:
  - `10 * player_count`
- Type unlocks:
  - `grunt`, `slugger`: wave 1
  - `glitch-spider`: wave 4
  - `splitter`: wave 6
  - `neon-pulse`: wave 8
  - `tank-bot`: wave 13

### Hellhound Waves

- Hellhound rounds happen on waves `5, 15, 25, ...`
- Normal enemies must clear before the dog packs begin
- Hellhounds spawn in 3-5 unit packs from one side of the arena
- The first dog in each pack becomes the alpha and can lead the others into coordinated flanks

## Scaling Formula

All regular enemies use exponential wave scaling:

```text
scaled_value = base_value * (scaling_multiplier ^ (wave - 1))
```

This means late unlock enemies arrive already scaled for the wave they first appear on.

## Behavior Summary

| Enemy | Main Ask | What It Punishes |
| --- | --- | --- |
| `grunt` | Move continuously | Standing still |
| `slugger` | Dodge lateral fire | Linear kiting |
| `hellhound` | Break packs quickly | Tunnel vision |
| `splitter` | Manage death timing | Greedy burst in bad positions |
| `mini-splitter` | Clean up loose threats | Overcommitting to large targets |
| `glitch-spider` | React under pressure | Late reads at short range |
| `neon-pulse` | Respect unsafe ground | Greed during telegraphs |
| `tank-bot` | Read charge lanes | Backpedal-only movement |

## Visual Language

- `grunt`: yellow baseline target
- `slugger`: orange ranged unit with circular read
- `hellhound`: deep red rush unit; alpha packs get a gold leader ring
- `splitter`: magenta segmented body
- `mini-splitter`: smaller light-purple shard
- `glitch-spider`: hot-pink latch threat
- `neon-pulse`: cyan telegraph + lingering pulse zone
- `tank-bot`: gray heavy body with charge lane indicator

## Implementation Notes

Live implementation touches:

- shared data: `shared/types.ts`, `shared/enemyConfig.ts`
- local gameplay: `src/lib/LocalGameEngine.ts`
- rendering and telegraphs: `src/components/GameCanvas.tsx`

If multiplayer parity is required for a new enemy behavior, update the durable object AI path as well:

- `worker/durableObject.ts`

## Adding More Enemies

When adding a new enemy, prefer a new combat question over another stat bundle.

Good additions usually do one of these:

- change spacing
- change target priority
- change pathing
- change the arena state
- force a readable reaction window
