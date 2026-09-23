# Open-map exploration: direction and first prototype

Date: 2026-09-12  
Status: Playable local prototype implemented; hands-on movement and balance review pending.  
Implementation updated: 2026-09-13.

## Play the prototype

Use **Open Map Prototype** on the home menu, or open [the local Dynamo prototype](http://localhost:5173/game/local?playerId=exploration-playtest&character=dash-dynamo&explorationPrototype=1). Select a reachable combat node to enter the yard. Only the first combat node becomes an open region; completing it returns to the existing route map.

- Move: WASD / arrow keys / left stick.
- Interact: E / right trigger. Discovering an anchor does not activate it automatically.
- Dynamo slide: Shift / A (or LB). Ability: Q / X (or RB).
- Tina: hold still for one second to strengthen nearby turrets; Q / X deploys them.
- Pause: Escape. Fullscreen: F. Testing controls: backslash.
- Testing controls can restart as Dynamo or Tina, select a seed, toggle spawning/invulnerability, and jump to a discovery. They pause the game while open.
- Seeds 0, 1 and 2 select three validated anchor clearings. Prototype sessions do not save progression, unlocks, leaderboards, or the normal last-run recap.

### Implemented and verified

The local slice includes world collision/navigation, a following camera, discovered-terrain map, momentum/slide and established-turret mechanics, cache and shortcut interactions, optional elite rewards, time pressure, the guardian/charge event, and return to the route map. Rendering culls distant enemies, projectiles, particles and pickups while their simulation remains in world space.

Verification scripts:

- `node scripts/test_exploration.mjs`: stage geometry for all three seeds, movement/slide, analog input, collision, one-time rewards, independent anchor requirements, pause/hidden-tab clocks, enemy caps, restart, route progression, and persistence isolation.
- `node scripts/verify_exploration_browser.mjs`: actual keyboard/controller input, screenshots, guardian combat, charging, upgrade selection, both characters' completion/return flows, resize and fullscreen. Controller input is emulated through the standard browser Gamepad API; physical-controller feel still needs a hands-on check.
- `node scripts/playtest_exploration.mjs`: automated direct-route and cache-detour runs for both characters, without invulnerability, recording completion, discovery time, damage and simulation timings.
- The repository's `develop-web-game` Playwright client was also run, with screenshots and text-state inspection.
- `npx tsc --noEmit -p tsconfig.app.json` and focused ESLint checks validate the affected code. No deployment is part of this slice.

Artifacts are under `output/exploration`, `output/exploration-browser`, and `output/exploration-skill-final` (local ignored output directories).

### Initial balance and remaining judgement calls

The prototype starts at 1.5× the character's base projectile damage. Guardian health is 1000 and a normal damaging hit removes half a displayed heart in the open region. These adjustments are scoped to the prototype; early five-hit-budget trials were too punishing for evaluating traversal and the 45-second event together.

All four recorded direct/cache-detour simulation runs completed after that tuning, taking approximately 51–68 active seconds with prior knowledge of the layout. They are automated navigation/combat trials, not human playtests or proof that the intended 3–5 minute discovery experience has been reached. The next review should focus on steering feel, whether the cache/elite is worth visiting, zone readability, and whether regions should grow in scope. Simulation-step timings were small in those trials; browser/device performance still depends on the player's hardware.

The authored layout and simple geometry are prototype art. Jumping, wall-climbing, sword-surfing, procedural region assembly, alternate exits and multiplayer remain deferred as described below.

## Direction

**Movement is the toy.** Build compact, explorable stages where terrain, discoveries, combat, and character movement reinforce one another. Characters should change how the player travels through and fights in the same environment.

The intended rhythm is:

**Choose a destination → explore and grow stronger → find and activate a Glitch Anchor → hold its area and defeat its guardian → claim a reward → choose the next destination.**

Glitch Anchor is a working name. Preserve the game's neon/pixel presentation, existing characters, automatic combat, upgrade choices, and branching run map. The prototype tests one explorable combat node within that structure. Whether whole floors eventually become open stages is a later decision.

## References and our interpretation

These are design references, not a specification to reproduce another game:

| Reference | Element to explore in Glitch Gauntlet |
| --- | --- |
| Megabonk | Enjoyable traversal, discoveries, and movement that affects combat builds |
| The Binding of Isaac | Distinct spaces, optional pockets, secrets, and the anticipation of finding something useful |
| Vampire Survivors | Accessible automatic combat, growing enemy pressure, and interacting upgrades |
| Slay the Spire / Slay the Spire 2 | Strategic route commitments, reward choices, and building around an emerging playstyle |
| Risk of Rain 2 | Exploration followed by an activated objective, a boss under zone pressure, and the cost of spending more time looting |

The user's Risk of Rain 2 description supplies the teleporter-event reference. Its official overview also describes handcrafted environments, bosses, scaling power, and the choice to finish or continue a run: [Risk of Rain 2 on Steam](https://store.steampowered.com/app/632360/Risk_of_Rain_2/). This document proposes our own rules; it does not depend on exact boss, portal, or stage rules in that game.

Our distinguishing combination is strategic map choices between regions, character-specific traversal within them, and a glitch-themed anchor encounter that leaves room to keep moving. Time pressure should make a detour a decision without making discovery feel like a mistake.

## What the first prototype must answer

1. Is moving through the region enjoyable before loot is added?
2. Does the same region feel meaningfully different as Dynamo and Tina?
3. Can players find the objective through readable environmental clues?
4. Does an optional detour feel tempting relative to increasing pressure?
5. Can an anchor event reward both moving within a zone and choosing a defensive position?
6. Does returning to the run map feel like a natural next decision?

A larger map or a working camera alone does not satisfy these questions.

## Prototype scope

| Included | Deferred |
| --- | --- |
| One authored top-down region with a following camera | Full 3D, elevated floors, jumping, wall-climbing |
| Dash Dynamo and Turret Tina with contrasting prototype mechanics | Full roster movement redesign and sword-surfing |
| One traversal loop, one shortcut, one secret, one optional elite | General procedural level generation and multiple biomes |
| One anchor event using an existing boss | New boss roster, randomized guardian pools, and encounter variants |
| Gradual visible pressure based on active stage time | Global endless scaling, looping runs, and final-boss route changes |
| Existing coins, XP, and upgrade presentation | New currencies, inventory systems, and a large new upgrade pool |
| Local opt-in prototype and return to the existing route map | Multiplayer support, deployment, and replacing every combat node |

The prototype should be playable in roughly 3–5 minutes per region. All numbers below are starting values for playtesting, not final balance commitments.

## Region: Broken Circuit Yard

Start with an approximately 3200 × 2000 world-unit footprint. Keep a reference view near today's 1280 × 720 combat scale rather than shrinking the entire world to fit the screen. Resize the canvas responsively without showing radically different combat ranges on different screens.

Use one authored layout with five recognisable spaces:

| Space | Purpose |
| --- | --- |
| Arrival clearing | Safe orientation, visible path choices, and a short opportunity to feel movement |
| Curved service lane | Long sweeping corners for momentum; joins the main loop at both ends |
| Broken machinery courtyard | Cover and multiple enemy approaches; an optional elite guards a reward |
| Maintenance pocket | A visually hinted secret with a one-time cache and an unlockable return shortcut |
| Anchor clearing | A broad combat area with a navigable ring, limited cover, and room for a guardian |

Every required location must be reachable by ordinary walking. The first shortcut opens through interaction from its far side, so both characters can use it. Momentum makes the route quicker; it never grants exclusive access to the exit.

Use solid walls/obstacles and walkable floor only in this slice. A low-looking prop must not imply a jump the player cannot perform. Avoid long empty corridors and mandatory retracing of cleared paths.

After the fixed layout works, allow a seed to select among three authored, validated anchor placements and a few reward sockets. Each candidate needs a reachable combat clearing. Keep the initial traversal comparison on a fixed seed so terrain changes do not obscure character differences.

Discovery presentation:

- Show local terrain and distinct landmarks clearly in the main view.
- Add a small map that records visited space and discovered points of interest.
- Hint toward the anchor using intermittent visible signal pulses; audio is supplementary.
- Reveal its map marker and an off-screen direction indicator after discovery.
- If it remains undiscovered after 90 seconds of active play, provide a broad directional hint.
- Reward sockets and the secret cache can be consumed only once per visit.

## Character experiments

These overrides apply only to prototype sessions. Make both test characters available there without changing their saved unlock state.

### Dash Dynamo: build speed, then spend it on a controlled slide

- Sustained movement builds a momentum meter over approximately two seconds.
- Momentum increases movement speed up to a provisional 1.5× normal speed and outgoing damage up to 1.25×.
- Stopping drains momentum quickly; a damaging hit, including shield damage, reduces it. A dodged or invulnerable hit does not.
- Replace the prototype's blink action with a short steerable slide that preserves momentum through turns. Start with a 0.45-second slide and two-second cooldown.
- A slide respects solid terrain and grants no new invulnerability. Preserve Overdrive's existing separate role.
- Show momentum clearly and use restrained feedback when the player loses it.
- Keep acceleration, steering, and deceleration tunable independently. Keyboard diagonals must not exceed straight-line speed; gamepad input must retain analog control.

The objective is deliberate cornering and route choice, not constant uncontrolled drifting.

### Turret Tina: establish, defend, relocate

- Keep responsive ordinary movement and her existing turret identity.
- After standing still for one second, become established: nearby owned turrets receive a provisional 30% firing-rate bonus within 160 world units.
- Moving ends the bonus immediately. Turret ownership, expiration, and placement limits remain enforced.
- Derive the temporary bonus from current state; do not repeatedly multiply stored base stats.
- Mark the established state and affected turrets so the benefit is understandable.
- Clearings offer defensible positions, while guardian attacks sometimes require a short relocation.

The objective is choosing where to hold ground. Tina must still be able to explore, escape, and complete the stage comfortably.

Use a fixed, representative starting power level for both characters during comparisons. Keep their existing identity and upgrades, but exclude arena-specific effects such as screen-wrap from the prototype's reward pool until their world behavior is defined. This restriction must not change normal-run rewards.

## Stage loop and anchor event

Keep stage phase separate from existing global game statuses:

`exploring → anchorActive → exitReady → returningToMap`

Death can interrupt any active phase. Restart initializes a fresh stage. Discovery is recorded independently of phase, so discovering the anchor does not activate it.

### Exploring

- Enemies arrive in small packs near reachable approaches outside the immediate view, with a safe distance from the player.
- The player collects normal XP/coins and can take an optional elite encounter or discover the cache.
- The elite is one designated stronger existing enemy with readable differentiation and a one-time reward. It is independent of the exit guardian.
- The anchor requires an intentional interaction after discovery. Walking past cannot trigger it.

### Anchor active

- Activate once, spawn one guardian, and replace exploration spawning with the event's spawn director. Do not run both directors simultaneously.
- Start with the existing Berserker, adapting its spawn, movement, and attack positions to the anchor clearing. Do not reset the region through the current arena boss-start routine.
- Use a provisional 260-unit charge radius and 45 seconds of accumulated occupied time.
- Charge progresses while the living player is inside the radius. Movement inside it is fully allowed.
- Leaving pauses charge; it does not erase progress. The player can retreat and recover position.
- Charge and guardian defeat are independent requirements. Reaching 100% with the guardian alive is insufficient; killing it early is also insufficient.
- Keep adds bounded and telegraphed, with approaches that cannot spawn inside walls or directly on the player.
- The clearing must support a circular movement route and more than one viable turret position. Do not fill the entire charge zone with unavoidable simultaneous hazards.

### Exit ready

- When the guardian is dead and charge is complete, stop the event director and stop pressure growth.
- Resolve remaining event hazards/adds with a short, visible shutdown so the reward interaction is safe.
- Present a one-time reward using existing upgrade/reward UI, then enable explicit exit interaction.
- Returning marks the selected combat node complete once and restores the normal reachable next-node choices. It does not mark the whole run as won or also pay the old combat-wave reward.
- The existing final-boss extraction remains a separate concept.

HUD objective copy should progress through `Find the Glitch Anchor`, `Activate the Glitch Anchor`, `Stabilise the Anchor`, and `Return to the route map`. During the event, display both charge and guardian status; outside the radius explain that charge is paused.

## Pressure and rewards

Use elapsed active stage time to add a modest cost to detours. Keep a fixed baseline for the first comparison; do not compound the existing wave, player-level, and encounter-wave difficulty formulas with another full scaling system.

Initial tuning:

- First 60 active seconds: baseline pressure.
- After that: smoothly add 15% spawn-budget pressure per minute, capped at 1.75× for this prototype.
- Start with active enemy caps of 24 during exploration and 40 during the event, with the guardian tracked separately.
- Pressure increases pack frequency/budget within the cap. It does not continuously increase existing enemy health or accelerate attacks beyond readable timings.
- Enemy rewards stay predictable. Tune detour rewards so an elite/cache can justify the time spent; rushing should be viable without being the only sensible choice.
- Give the cache and elite fixed, one-time payouts through existing reward types. Defer merchants and additional currencies.

The pressure clock uses simulation time. Pause it during the pause menu, upgrade choices, testing controls, route selection, and hidden-tab suspension. Resume without charging elapsed wall-clock time or applying a large catch-up tick. Freeze anchor charge and combat consistently with the same pause behavior.

Show a simple pressure indicator with elapsed stage time. Do not add a global countdown or a surprise instant-death deadline.

## Fit with the current implementation

Checked against the working tree on 2026-09-12:

| Current surface | Existing behavior and required adaptation |
| --- | --- |
| `src/components/GameCanvas.tsx` | Uses fixed 1280 × 720 arena dimensions. Separate world rendering/camera transforms from screen-space HUD, overlays, and effects. |
| `src/lib/LocalGameEngine.ts` | Owns movement, spawning, combat waves, bosses, rewards, and map transitions. Add a stage controller and world queries without putting every new rule into this already large file. |
| `shared/types.ts` | Contains inputs, players, run-map nodes, and game state. Add explicit optional prototype/world state with safe legacy defaults. |
| `src/pages/GamePage.tsx` | Creates local sessions and coordinates pause, overlays, and run flow. Own the opt-in entry and session setup here. |
| `src/hooks/useLocalGameLoop.ts` and `src/hooks/useGamepad.ts` | Existing keyboard/gamepad actions overlap interaction and character actions. Resolve prototype interaction context so activating an anchor cannot also fire an ability. Space already has an action; do not silently replace it with jump. |
| `src/components/UnifiedHUD.tsx` | Reuse the current HUD for objective, pressure, charge, and movement-state information. |
| `src/components/RunMapOverlay.tsx` | Preserve route inspection/confirmation and return to a completed node with reachable successors. |
| `src/components/TestingArenaPanel.tsx` | Reuse for restarting the prototype, selecting a test character/seed, toggling spawns, and inspecting state. |

Important integration boundaries:

- Many engine operations clamp to arena edges: ordinary movement, dash/blink, enemy placement, boss movement, teleports, projectile lifetime, and screen-wrap. Audit each affected path; changing two dimension constants is insufficient.
- World collision must cover movement, slides, enemy navigation, turret placement, and projectile/cover rules. Use swept movement or bounded substeps so fast motion cannot cross thin walls.
- Use a simple walkability grid and bounded pathfinding/replanning for ground enemies. Validate player-sized and guardian-sized clearance. Introduce more advanced navigation only if evidence requires it.
- Ordinary projectiles hit solid cover; any exception must be explicitly identified. Auto-targeting should consider range and line of sight, so actors do not shoot indefinitely at unreachable targets behind walls.
- Keep gameplay simulation in world coordinates. Culling is a rendering decision, not permission to delete a nearby off-screen fight. Use bounded entity lifetime/distance rules for cleanup and leave persistent rewards available.
- Clamp the following camera at world edges; allow a small dead zone and modest smoothing. Avoid momentum-based zoom in the first pass.
- `updateWaves` currently completes combat by exhausting waves. It must defer to the prototype controller while the open region is active.
- `updateExtraction` currently sets the run to `won` after post-boss extraction. Reuse visual/interaction patterns, not that completion behavior.
- Current autoplay assumes arena-centric movement. Extend deterministic test controls for this stage; do not assume existing autoplay will navigate it.
- Prototype sessions must not write leaderboard scores, unlocks, progression counters, or replace the normal last-run recap. Audit intermediate progression writes as well as end-of-run submission.
- Preserve existing local and online state compatibility when prototype fields are absent. Multiplayer world simulation is outside this slice.

## Implementation sequence

### 1. Add an isolated local entry and stage contract

- Add an explicit local option such as `explorationPrototype=1`; normal sessions default to the current behavior.
- The first selected combat node in that session becomes the prototype region. After completion, return to the map; later encounters follow normal routing.
- Support Dynamo/Tina selection and deterministic seeds through the existing testing panel, with restart using the same initialization path.
- Define world dimensions, collision geometry, discovery state, stage phase, active time, anchor state, and consumed rewards.
- Guard all prototype-session persistence. Keep normal run results intact.

Deliverable: an opt-in session can enter/restart an empty region and exit through a test control back to its route map.

### 2. Build traversal before combat

- Author the region, world collision, camera, and map discovery.
- Implement Dynamo momentum/slide and Tina's established state with keyboard/gamepad prompts.
- Normalize digital movement and retain analog magnitude.
- Add test-visible coordinates, velocity, momentum, collision contacts, and camera bounds.

Deliverable: both characters traverse the full loop and shortcut without enemies, clipping, camera loss, or inaccessible required areas. Playtest the feel before expanding content.

### 3. Add exploration pressure and discoveries

- Add reachable spawn points, capped pack spawning, navigation, cover-aware combat, and pressure time.
- Add the optional elite, secret cache, and seed-selected validated sockets.
- Use existing XP, coins, and upgrade choices; ensure every discovery has readable feedback.

Deliverable: the player can choose a direct route or take a rewarded detour while understanding the changing pressure.

### 4. Add the Glitch Anchor event and completion

- Add discovery, explicit activation, guardian spawn, charge occupancy, and event spawning.
- Wire independent guardian/charge conditions, shutdown, one-time reward, and explicit exit.
- Integrate return to the selected route-map node without ordinary wave completion or final extraction firing.

Deliverable: a complete exploration → anchor → reward → route-map loop works with both characters.

### 5. Verify and tune the complete slice

- Extend the existing game-state text/debug output and time advancement controls for the new state.
- Add targeted behavior checks for the high-risk boundaries below.
- Play real keyboard and gamepad runs, inspect screenshots and console errors, and record comparative observations.
- Tune camera, steering, region size, time pressure, and zone geometry before adding more mechanics.

Deliverable: a reviewable playable prototype with recorded verification, known limitations, and a recommendation on whether to expand it.

## Verification and acceptance

Use the project's `develop-web-game` skill when implementation starts, including its short-input Playwright loop, screenshots, and state inspection. Planning this document does not require a build. During implementation run relevant checks; avoid unrelated cleanup and repeat builds only when justified or requested.

| Area | Required evidence |
| --- | --- |
| Traversal | Both characters reach the anchor, cache, elite, and shortcut on every allowed placement; maximum-speed slides cannot cross walls. |
| Camera | Player remains visible at world edges and after resize; HUD stays fixed; visual collisions match world geometry. |
| Controls | Keyboard/gamepad movement, slide, ability, interaction, and pause are usable; one press cannot activate the anchor twice or accidentally trigger an ability. |
| Navigation and spawning | Enemies navigate the loop, spawn on reachable floor away from the player, and cannot become trapped indefinitely; entity counts remain bounded. |
| Anchor transitions | Leaving preserves charge; charge-only and guardian-only states do not complete; satisfying both completes once. |
| Clock | Pauses, upgrade choices, and hidden-tab suspension advance neither pressure nor charge. Resume causes no simulation jump. |
| Lifecycle | Death, restart, reward selection, and exit cannot duplicate rewards, retain stale projectiles, or soft-lock progression. |
| Route integration | Correct node completes and successors become reachable; no early run victory or second legacy wave reward occurs. |
| Session isolation | Prototype entry/restart/completion does not persist scores, unlocks, counters, or recap changes; a normal session retains existing arena/map behavior. |
| Performance | Compare frame times/entity counts against the current arena on the same machine and viewport, including the event cap; inspect for hitching and memory/entity growth. |

For playtesting, record at least a direct-route and a detour run for each character on the same seed. Record anchor discovery time, total completion time, damage taken, reward gains, charge time spent outside the radius, and where navigation became confusing. Collect human feedback on steering, finding the objective, and whether the detour was worth it. Automated completion is not evidence that movement feels good.

Proceed beyond the slice when both characters can complete it, the objective is readable, required locations remain accessible, optional discoveries are worth considering, and the full loop has no blocking navigation/state errors. If traversal is dull, revise terrain and movement first. If time pressure discourages every detour, reduce it or improve rewards before increasing map size.

## Later decisions, after the prototype

- Whether open regions should replace most combat nodes or become larger stages containing several encounters.
- Whether alternate exits should supplement or eventually replace some map choices.
- Whether pressure should persist between stages and how it interacts with route depth.
- Whether sword-surfing, jumps, and climbable terrain justify additional elevation and collision rules.
- How each remaining character gains a distinct traversal relationship without forcing exclusive routes.
- Whether authored region sections can be assembled procedurally while preserving good movement lines.
- Whether an anchor variant with connected sub-zones improves the movement/defense tension.

These are expansion options, not prerequisites for the first playable test.
