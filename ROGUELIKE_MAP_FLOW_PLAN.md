# Roguelike Map Flow Plan

## Direction

Pivot the current route map away from a left-to-right lane graph and into a radial run map:

- the current character sits in a circular core at the center
- 4 outward routes extend from that core
- each route leads to its own boss
- each route has internal split/rejoin decisions
- routes stay distinct instead of collapsing into one shared late-game lane

This is the recommended v1 shape because it gives the run map its own identity while still fitting the current local-mode engine and encounter systems.

## V1 Shape

- 4 boss routes
- 1 center hub
- 6 rings from center to boss
- 1 boss per route
- 2 branch/rejoin moments inside each route
- 1 guaranteed special pressure node per route
- no cross-route bridge nodes in v1

Use the cardinal layout:

- north route
- east route
- south route
- west route

Each route should read as a commitment to a boss destiny, not a loose network web.

## Core Loop

1. Run starts on the radial map.
2. The center core shows the current character/run state.
3. Player picks one of the 4 route-entry nodes.
4. The run advances outward along that route.
5. Internal route forks offer local tactical choices.
6. The final boss node ends that route and the floor.

The key difference from the current graph:

- the important first choice is which boss route to pursue
- later choices shape how that route plays
- route identity is preserved all the way to the boss

## Ring Structure

### Ring 0: center core

- large circular hub
- contains current character portrait or full-body image
- shows run status and route selection origin
- not normally selectable after the run starts

### Ring 1: route entry

One node per route:

- north-entry
- east-entry
- south-entry
- west-entry

Purpose:

- early commitment to a boss path
- clear read of the 4 available destinies

Recommended node type:

- `combat`

### Ring 2: first fork

Each route splits into two choices.

Purpose:

- establish local variation early
- make route selection more than a straight line

Recommended node mix:

- `combat`
- `combat` or `shop`

### Ring 3: first pressure point

The route rejoins or narrows into a single route-specific node.

Purpose:

- define the route's main identity
- insert the route's guaranteed special node

Recommended node mix by route:

- one route gets `shop`
- one route gets `hellhound`
- one route gets `combat` with recovery rewards
- one route gets `combat` with power rewards

### Ring 4: second fork

Each route splits again into two choices.

Purpose:

- give the player one more way to shape the route
- let the route hint at boss preparation

Recommended node mix:

- `combat`
- `shop` or `combat`

### Ring 5: pre-boss prep

The route narrows back into one node before the boss.

Purpose:

- final readable prep step
- communicate "boss next"

Recommended node mix:

- `combat`
- occasionally `shop` on economy-leaning routes

### Ring 6: boss

One boss node per route:

- north-boss
- east-boss
- south-boss
- west-boss

Purpose:

- every route has a known destination
- the boss is visible from the start

Recommended node type:

- `boss`

## Route Identities

Each route needs mechanical identity, not just a different boss at the end.

### North route: economy/control

- higher chance of shop access
- reward bias toward coins, discounts, and stock
- boss should feel methodical or control-heavy

### East route: aggression/power

- higher pressure combat nodes
- reward bias toward damage and tempo
- boss should feel berserker or brute-force oriented

### South route: sustain/recovery

- safer node pattern
- reward bias toward healing and survival
- boss should feel attritional or endurance-based

### West route: hellhound/high risk

- guaranteed hellhound pressure point
- reward bias toward high-value power payouts
- boss should feel volatile or punishing

These route identities are important because they make the map itself part of the build and survival strategy.

## Boss Assignment Rule

In v1, each route owns exactly one boss.

Recommended approach:

- preassign one boss to each route when the floor is generated
- show the boss icon and name from the start
- keep boss assignment fixed for the entire run

Good v2 extension:

- rotate route-to-boss pairings between floors/acts

## Node Type Rules

Keep the node type set small in v1:

- `combat`
- `hellhound`
- `shop`
- `boss`

Do not add event/rest/treasure nodes yet.

Reason:

- the encounter systems already exist for combat/shop/hellhound/boss
- route shape is the new feature we need to prove first
- extra node classes would add content debt before the new map loop is stable

## Generator Rules

The current map generator thinks in left-to-right `depth` plus lane positions.

The radial version should think in:

- `arm`
- `ring`
- `slot`

Recommended mental model:

- `arm`: north, east, south, west
- `ring`: 1 through 6
- `slot`: inner branch position within a ring for split nodes

Keep the shared `RunMapNode` model for v1, but generate radial coordinates instead of ladder coordinates.

Practical implementation:

- keep `depth` as the logical outward progression step
- reinterpret `depth` as ring index for the overlay
- keep `nextNodeIds` exactly as they work now
- replace lane-based coordinate generation with polar coordinate generation

So the engine contract stays mostly the same while the visual topology changes completely.

## Recommended Route Topology

Each route should follow this pattern:

- ring 1: single entry node
- ring 2: two-node split
- ring 3: one-node rejoin
- ring 4: two-node split
- ring 5: one-node pre-boss rejoin
- ring 6: boss

That gives 8 nodes per route including the boss.

Across 4 routes plus the center core, the map reads as:

- 1 center core
- 4 route entries
- 8 ring-2 split nodes
- 4 ring-3 special nodes
- 8 ring-4 split nodes
- 4 ring-5 prep nodes
- 4 bosses

Total visible structure:

- 33 map elements if the center core is counted visually

This is dense enough to feel interesting, but still readable.

## UI Layout Rules

### Center core

- oversized circular frame
- player portrait or standing character in the center
- subtle motion or ambient energy pulse
- route sockets around the edge of the circle

### Routes

- routes radiate evenly from the center
- each route has its own subtle color accent
- route lines should highlight continuously from hovered node back to the center and forward toward the boss

### Nodes

- small icon-first nodes
- hoverable even when not currently reachable
- full details shown in the side panel
- reachable nodes brighter and more reactive
- bosses visibly larger than regular nodes

### Side panel

Keep the current inspect panel concept.

It should show:

- node type
- route name
- boss destination
- ring index
- rewards

### Animation

Recommended motion:

- map opens with the center core first
- routes extend outward from the center
- hovering a route brightens that whole arm
- selecting a node sends a pulse from the center into that route

## UX Rules

### Readability

The player should immediately understand:

- where they are
- which route leads to which boss
- which nodes are reachable now
- what kind of risk/reward identity each route has

### Interactivity

- all nodes inspectable on hover
- only reachable nodes selectable
- route highlight should make hover state obvious
- boss destination should be visible from every node on that route

## Implementation Plan

### Phase 1: plan the radial topology

- lock the 4 route identities
- lock boss assignments
- define exact node patterns for each ring

### Phase 2: update generator

- replace the current lane graph template with 4 radial route templates
- generate `x/y` positions from polar coordinates
- preserve `nextNodeIds`-based traversal

### Phase 3: update overlay

- render center core separately from normal nodes
- draw radial routes from the core to each arm
- update hover highlighting so whole arms light up

### Phase 4: route identity polish

- add route labels or route summary text
- bias rewards by route identity
- bias special-node placement by route identity

## Explicit V1 Decisions

- use 4 routes, not 5
- no bridge nodes between routes in v1
- 1 boss per route
- all bosses visible from the start
- all node types visible from the start
- center hub is visual and informational, not a repeat-select node
- boss defeat ends the run for v1

## V2 Candidates

Once the radial map is stable, good next additions are:

- neighbor-route bridge nodes between rings 3 and 4
- second floor/act after boss clear
- route-specific event nodes
- route-specific mini-elites
- dynamic route corruption or map hazards

## Success Criteria

The radial pivot is successful if:

- the map no longer reads like a generic horizontal graph
- the player can choose a boss route intentionally at a glance
- each route feels mechanically distinct
- the route still contains meaningful local choices
- the existing combat/shop/hellhound/boss systems plug into it without a full engine rewrite
