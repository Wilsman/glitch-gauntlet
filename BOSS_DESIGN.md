# Boss Design Document

## Core Philosophy

- Skill-based, not stat checks: attacks must be readable before they are lethal.
- Clear telegraphs: players should understand what killed them and what to do next time.
- Set-piece pacing: bosses break the wave rhythm without abandoning the same movement language.
- Roster variety: bosses should ask for different reads, not just larger HP pools.

## Live Boss Roster

Implemented boss types in `shared/bossConfig.ts`:

- `berserker`
- `summoner`
- `architect`
- `glitch-golem`
- `viral-swarm`
- `overclocker`
- `magnetic-magnus`
- `neon-reaper`
- `core-destroyer`

## Encounter Flow

### Trigger

- Boss fights happen every 10 waves: `10, 20, 30, ...`
- The arena clears and `state.status = "bossFight"` pauses normal enemy spawns
- Bosses spawn around arena center and scale by boss-wave number

### After the Kill

When a boss dies:

1. The arena goes quiet.
2. A teleporter appears.
3. The player chooses:
   - `Extract`: end the run successfully
   - `Continue`: take a legendary reward and resume the run

## Why Regular Enemies Matter

The regular roster now trains the same readability rules the bosses use:

- `slugger` trains lateral dodge reads.
- `hellhound` trains coordinated angle pressure.
- `neon-pulse` trains respect for telegraphed unsafe ground.
- `tank-bot` trains charge-lane recognition and repositioning.
- `glitch-spider` trains panic recovery under close pressure.

That matters because boss fights should feel like a culmination of mastered reads, not a separate minigame.

## Boss Archetypes

### Berserker

- Theme: melee rushdown
- Signature reads:
  - charge telegraph
  - ground slam into expanding rings
- Phase shift: enrages below threshold and chains faster rushes

### Summoner

- Theme: target-priority test
- Signature reads:
  - portal spawns
  - teleport repositioning
  - beam pressure
- Phase shift: adds more summoned pressure and tighter beam windows

### Architect

- Theme: positional puzzle
- Signature reads:
  - rotating laser patterns
  - floor hazard telegraphs
  - shield generators
- Phase shift: speeds up the arena pattern density

### Glitch Golem

- Theme: heavy area control
- Signature reads:
  - glitch zone
  - builder-drop crash telegraphs
  - collapse pulses / shockwave pressure
- Design note: recent updates favor readable anti-movement crashes over helper-style floor walls

### Viral Swarm

- Theme: speed and swarm pressure
- Signature reads:
  - dash bursts
  - clone / bit pressure
  - cloud-style arena clutter

### Overclocker

- Theme: tempo disruption
- Signature reads:
  - burst windows
  - time-slow fields
  - pacing changes that punish autopilot movement

### Magnetic Magnus

- Theme: orbit and pull control
- Signature reads:
  - magnetic flux pulls
  - tesla ball spacing
  - storm zones

### Neon Reaper

- Theme: assassin boss
- Signature reads:
  - short telegraph dashes
  - decoy spawns
  - burst punish windows

### Core Destroyer

- Theme: endurance / orbital siege
- Signature reads:
  - satellite beams
  - system-collapse pressure
  - slow but high-commitment beam telegraphs

## Telegraph Language

- Red: direct damage / imminent hit
- Yellow or orange: area denial / hazard setup
- Blue or cyan: shield, time, or energy control
- Purple or magenta: debuff, glitch, or trap pressure
- Motion line or lane: dash / charge / beam commitment

## Design Guardrails

- Telegraphs should be visible without UI text.
- Phase changes should alter timing, combinations, or coverage, not just inflate health.
- Boss attacks should reuse arena lessons the player already learned from the normal roster.
- If a boss attack becomes unreadable in chaos, simplify the pattern before increasing damage.

## Implementation Surfaces

- shared config and constants: `shared/bossConfig.ts`
- attack definitions and state: `shared/types.ts`
- local boss logic: `src/lib/LocalGameEngine.ts`
- rendering / telegraphs: `src/components/GameCanvas.tsx`

If the multiplayer path needs parity, the durable object attack logic must stay aligned with the local engine.
