# Boss Design Document

## Core Philosophy
- **Skill-based, not stat-checks**: Bosses telegraph attacks with visual warnings; dodging/positioning matters more than raw DPS
- **Readable patterns**: Clear wind-ups and indicators so success feels earned
- **Set-piece moments**: Break up wave-clearing rhythm with focused encounters
- **Variety**: Different boss archetypes to keep milestone waves fresh

---

### Shortlist of bosses

- Berserker
- Summoner
- Architect

## Boss Encounter Flow

### Trigger
- **Every 10th wave** (10, 20, 30...) triggers boss mode
- `state.status = 'bossFight'` pauses normal wave spawns
- Arena clears of regular enemies, boss spawns at center

### Post-Boss Choice
Once boss defeated:
1. **Empty arena** - no enemies, no timer pressure
2. **Teleporter spawns** with two options:
   - **Extract Now**: Win condition, end game successfully
   - **Continue Fighting**: Teleporter despawns, resume normal waves with **bonus reward**
     - Options: Legendary upgrade choice, permanent stat boost, unique item, extra life, etc.

---

## Boss Archetypes

### 1. **The Berserker** (Wave 10) - IMPLEMENTING FIRST
**Theme**: Melee rushdown with telegraphed charges

**Mechanics**:
- **Charge Attack**: Boss glows red, pauses 1s, then dashes in straight line (leaves fire trail)
  - Telegraph: Red glow + directional indicator
  - Counterplay: Sidestep perpendicular to charge
- **Ground Slam**: Raises fists, slams creating expanding shockwave rings
  - Telegraph: 1.5s wind-up animation, boss jumps slightly
  - Counterplay: Dodge through gaps between rings or stay at max range
- **Enrage Phase** (below 30% HP): Movement speed +50%, charges more frequently
  - Visual: Boss turns darker red, steam particles

**Stats**:
- Health: 2000 (scales with wave)
- Damage: 20 per contact
- Size: 40px radius (larger than normal enemies)
- Movement Speed: 1.5 (slower than player, but charges are fast)

**Attack Pattern**:
1. Idle/Chase for 2-3s
2. Random choice: Charge (60%) or Slam (40%)
3. Cooldown 1s
4. Repeat

**Enrage Trigger**: Health < 30%
- Charge probability → 80%
- Cooldown → 0.5s
- Movement speed → 2.5

**Arena**: Standard, no hazards

---

### 2. **The Summoner** (Wave 20) - IMPLEMENTED
**Theme**: Spawns minions, tests target prioritization

**Mechanics**:
- **Summon Portals**: Creates 3 glowing portals that spawn weak enemies every 3s
  - Telegraph: Portals appear with 2s delay before first spawn
  - Counterplay: Destroy portals (low HP) or kite minions
- **Teleport**: Boss vanishes, reappears at random edge after 2s
  - Telegraph: Boss becomes translucent, sparkles at destination
  - Counterplay: Reposition to avoid being surrounded
- **Curse Beam**: Fires slow-moving purple beam that applies "Cursed" (damage taken +50% for 5s)
  - Telegraph: Boss channels for 1s, beam path shown as thin line
  - Counterplay: Strafe to avoid beam

**Phase 2** (below 50% HP): Summons elite mini-boss (buffed hellhound) - not too fast though

**Arena**: Standard

---

### 3. **The Architect** (Wave 30+) - IMPLEMENTED
**Theme**: Arena hazards, positioning puzzle

**Mechanics**:
- **Laser Grid**: Boss hovers at center, fires rotating laser beams (4 beams spinning slowly)
  - Telegraph: Beams glow yellow before activating, rotate predictably
  - Counterplay: Move between beams, time your shots
- **Floor Hazards**: Marks 3x3 grid squares that explode after 2s
  - Telegraph: Squares glow orange → red before explosion
  - Counterplay: Stay mobile, avoid marked zones
- **Shield Phase**: Boss becomes invulnerable, spawns 4 shield generators at corners
  - Telegraph: Boss glows blue, generators spawn with health bars
  - Counterplay: Destroy generators to break shield

**Phase 2** (below 40% HP): Laser beams speed up, more floor hazards

**Arena**: Could add static obstacles (pillars) for cover

---

## Telegraphing System

### Visual Language
- **Red glow/particles**: Incoming damage attack
- **Yellow/orange**: Area denial/hazard warning
- **Blue**: Shield/invulnerability
- **Purple**: Debuff/curse
- **Translucent**: Teleport/phase shift

### Timing
- **Fast attacks** (charges): 0.5-1s telegraph
- **Heavy attacks** (slams): 1-2s telegraph
- **Hazards** (floor explosions): 2-3s telegraph

### Audio Cues
- Distinct sound for each attack type (charge whoosh, slam rumble, portal hum)

---

## Type Definitions

```typescript
interface Boss {
  id: string;
  type: 'berserker' | 'summoner' | 'architect';
  position: Vector2D;
  health: number;
  maxHealth: number;
  phase: 1 | 2;
  currentAttack?: BossAttack;
  attackCooldown: number;
  isEnraged?: boolean; // Berserker specific
  // Specific to boss type
  portals?: Portal[];
  shieldGenerators?: ShieldGenerator[];
  isInvulnerable?: boolean;
}

interface BossAttack {
  type: 'charge' | 'slam' | 'summon' | 'teleport' | 'beam' | 'laser-grid' | 'floor-hazard';
  telegraphStartTime: number;
  telegraphDuration: number;
  executeTime?: number;
  targetPosition?: Vector2D;
  direction?: Vector2D;
}

interface ShockwaveRing {
  id: string;
  position: Vector2D;
  currentRadius: number;
  maxRadius: number;
  damage: number;
  timestamp: number;
  hasHitPlayer?: boolean; // Track if player already hit by this ring
}
```

---

## Reward for Continuing

After boss defeat, if player chooses to continue:
- **Immediate**: Choice of 3 legendary upgrades
- **Persistent**: +10% all stats for remainder of run
- **Unique**: Boss-specific item (e.g., "Berserker's Rage" = damage scales with missing health)

---

## Implementation Phases

### Phase 1: The Berserker (Current)
- [ ] Add Boss types to `shared/types.ts`
- [ ] Create `shared/bossConfig.ts` with Berserker config
- [ ] Update `LocalGameEngine` to detect wave 10 and spawn boss
- [ ] Implement Berserker AI (charge, slam, enrage)
- [ ] Add telegraph rendering to `GameCanvas`
- [ ] Add shockwave ring collision detection
- [ ] Implement post-boss extraction choice UI
- [ ] Add "continue" reward system

### Phase 2: The Summoner (Future)
- TBD

### Phase 3: The Architect (Future)
- TBD

---

## Design Decisions

### Answers to Open Questions
1. **Boss frequency**: Every 10 waves (10, 20, 30...)
2. **Difficulty scaling**: Same mechanics, higher stats based on wave
3. **Multiple bosses**: Random selection from all 3 boss types (Berserker, Summoner, Architect)
4. **Extraction pressure**: Infinite time to choose (no timer)
5. **Boss variety**: All 3 bosses implemented with random selection
