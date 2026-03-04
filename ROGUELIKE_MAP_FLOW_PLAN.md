# Roguelike Map Flow Plan

## Goal

Replace the current auto-advancing wave ladder with a Slay-the-Spire-style route map that still uses the existing combat arena, neon HUD language, shops, hellhound rounds, and boss fights.

The target run shape for the first pass:

- One run floor = 10 map nodes.
- Nodes 1-9 are route choices.
- Node 10 is a single converged boss node.
- Shop nodes are explicit path choices instead of guaranteed cadence breaks.
- Hellhound nodes become explicit path choices around the middle of the floor instead of a fixed timer insertion.

## Current Constraints

The live game does not have a separate encounter-map model yet. Progression is driven by:

- `GameState.wave`
- `status`
- `isShopRound`
- `isHellhoundRound`
- `waitingForHellhoundRound`
- `shopPendingBossType`
- `boss`

The main hardcoded progression logic lives in `src/lib/LocalGameEngine.ts`:

- `startShopRound()` / `endShopRound()`
- `updateWaves()`
- boss defeat -> `bossDefeated`
- `continueAfterBoss()` / `extract()`

This means the rework is not just UI. The engine currently decides the next encounter from timer math, not from a chosen node.

## Recommended Structure

### 1. Separate map depth from combat difficulty

This is the main architecture choice.

Recommended:

- `mapDepth`: 1-10, counts every node on the route, including shop nodes.
- `combatTier`: counts only combat encounters and boss escalation.

Why:

- The user-visible map should treat shop nodes as real path nodes.
- Enemy and boss scaling should not increase just because the player visited a shop.
- Existing unlocks and progression storage are tied to `wave`/highest-wave semantics, so we should keep one hidden difficulty counter instead of overloading map depth.

Practical first-pass mapping:

- Keep `wave` as the hidden combat tier for scaling/unlocks.
- Add `mapDepth` for route position and UI.

### 2. Add an explicit run-map state

Add a small run-map model to `GameState`, something like:

- `mapState`
- `mapDepth`
- `currentNodeId`
- `availableNextNodeIds`
- `selectedNodeId`
- `currentEncounterType`
- `floorIndex`

Add a new game status:

- `mapSelection`

Flow:

1. Run starts on the map.
2. Player selects a reachable node.
3. Engine resolves that node into combat/shop/hellhound/boss.
4. On completion, return to `mapSelection` unless the run is over.

## Node Types

MVP node types:

- `combat`
- `hellhound`
- `shop`
- `boss`

Good v2 candidates once the core loop works:

- `treasure`
- `rest`
- `elite`
- `event`

Recommendation for the first playable version: do not add rest/treasure yet. The current game already has enough moving parts; combat/shop/hellhound/boss is enough to prove the map loop.

## Floor Layout Proposal

### Shape

- 3 start nodes at depth 1.
- 3-4 active lanes across depths 2-9.
- Frequent merges and splits so route choice matters without creating dead space.
- All lanes converge into one boss node at depth 10.

### Encounter distribution

Suggested guarantees for one 10-node floor:

- Depths 1-4: mostly combat.
- Depth 5: hellhound pressure point on most routes.
- Depths 6-8: mixed combat and shop access.
- Depth 9: final prep node, usually combat or shop.
- Depth 10: boss.

Concrete first-pass rule set:

- Exactly 1 boss node at depth 10.
- At least 1 shop node somewhere in depths 6-9.
- Prefer 2 shop nodes total across the graph, but do not guarantee access to both.
- At depth 5, generate 2 hellhound nodes and 1 standard combat node when possible.
- Guarantee at least one safe route that skips hellhound.
- Guarantee at least one high-risk route that can hit hellhound and a later shop.

This gives the player actual routing tension:

- safer route
- richer route
- risk-then-recover route

## Visual Direction

Do not copy the parchment look directly. Keep this repo's neon/glitch identity.

Recommended presentation:

- Dark holographic network map over the existing black/neon palette.
- Nodes as glowing chips with strong icon silhouettes.
- Dashed connection lines with scanline flicker and small routing pulses.
- Unknown future nodes can stay partially obfuscated until reachable.
- The boss node should look oversized and unstable, like a corrupted system core.

Node icon language:

- `combat`: crossed reticle / enemy glyph
- `hellhound`: red canine/skull mark
- `shop`: coin or stand icon
- `boss`: oversized hazard/core icon

## UX Flow

### Between encounters

After an encounter ends:

- freeze arena action
- open map overlay
- highlight reachable next nodes only
- allow mouse hover + click
- allow gamepad/keyboard selection

### Shops

Keep the existing in-arena stand shop for now.

Reason:

- the game already has working world-space shop stands
- the shop node can feel distinct without inventing a second shop UI system
- this keeps scope under control

So the player chooses a `shop` node on the map, then loads into the existing shop-round stand scene.

### Hellhound nodes

Treat them as explicit encounter cards on the map, not surprise timer events.

That means:

- no `waitingForHellhoundRound`
- no fixed every-10-wave hellhound scheduler
- hellhound route value is legible before the player commits

## Engine Refactor Plan

### Phase 1: state model

- Add map-related types to `shared/types.ts`.
- Add `mapSelection` status.
- Generate one floor graph at run start.
- Track `mapDepth` and selected node.

### Phase 2: encounter resolution

- Replace `updateWaves()` as the source of "what comes next".
- Keep wave timer only inside active combat encounters.
- Start encounters from node type:
  - combat -> normal enemy wave
  - hellhound -> hellhound encounter
  - shop -> existing shop round
  - boss -> boss encounter

### Phase 3: completion handling

- Combat complete -> return to map.
- Hellhound complete -> return to map, optionally with legendary reward.
- Shop leave -> return to map, not auto-spawn boss unless the chosen node was boss.
- Boss complete -> floor clear or extraction choice.

### Phase 4: UI

- Add `MapOverlay` or `RunMapOverlay`.
- Update HUD to show both:
  - floor depth (`NODE 4/10`)
  - combat tier/wave (`THREAT 3`)
- Remove assumptions that the next state is always "another timed wave".

## Systems That Need Attention

### 1. Difficulty scaling

Current scaling depends on `wave`.

Recommendation:

- Keep `wave` as combat difficulty for MVP.
- Only increment it on combat and boss nodes.
- Do not increment it on shop nodes.

### 2. Unlocks and meta progression

Current progression storage tracks:

- `highestWaveReached`
- unlocks keyed off wave thresholds

Recommendation:

- Leave this intact in MVP by keeping `wave` as the hidden combat tier.
- Add map-depth tracking later if we want new unlocks tied to route progress.

### 3. Boss flow

Current boss flow assumes:

- boss defeat -> teleporter -> extract or continue

For the map version:

- depth-10 boss clears the floor
- if we only have one floor for MVP, boss defeat can still end in extract/win
- if we want multi-floor runs later, `continue` should advance to the next generated floor instead of `wave++`

## MVP Recommendation

Build the smallest convincing version first:

1. One 10-node floor.
2. Node types limited to combat, hellhound, shop, boss.
3. Existing arena combat unchanged.
4. Existing shop stands reused.
5. Boss at node 10 ends the run for v1.

This gets the routing fantasy into the game fast without rewriting every system at once.

## Open Decisions

These are the main design calls still worth settling before implementation:

1. Should every run guarantee at least one shop path and one no-shop greedy path?
2. Should hellhound nodes always appear at depth 5, or be allowed at depths 4-6 with weighted generation?
3. After the depth-10 boss, do we want:
   - immediate win/extract only, or
   - a second floor/act option?
4. Do we want node types to be fully visible from the start, or should non-adjacent nodes stay unknown?

## Suggested Build Order

1. Add map state/types and a static generated 10-node floor.
2. Add a simple route-select overlay with placeholder nodes.
3. Route selected nodes into existing combat/shop/boss engine flows.
4. Remove hardcoded auto-advance cadence from `updateWaves()`.
5. Rework HUD text from wave-only to map-depth + threat-tier.
6. Tune graph generation and rewards after the loop is playable.
