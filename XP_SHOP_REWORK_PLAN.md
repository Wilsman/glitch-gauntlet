# XP + Shop Rework Plan (Hades-Inspired, Not 1:1)

## Goals
- Make progression legible and skill-rewarding.
- Tie XP to combat performance (kills), not passive time gain.
- Keep coin spending meaningful through real tradeoffs.
- Add shop rounds that amplify decisions, not erase run tension.

## Design Pillars
- `XP = earned by kills`: harder enemies grant more XP.
- `Coins = strategic currency`: limited, high-pressure spending.
- `Fixed prices`: no rubber-banding by player power.
- `Visible unaffordable options`: teach future planning and create intentional regret.
- `Shops are decision amplifiers`: not guaranteed safety.

## System Overview

### 1) XP Progression (Kill-Based)
- Remove passive XP gain entirely.
- Grant XP from enemy kills using enemy difficulty:
  - Use existing `enemy.xpValue` as the base source of truth.
  - Keep stronger enemies worth meaningfully more XP.
- Level-up flow remains:
  - XP bar fills from kill rewards.
  - On level threshold, pause and show upgrade choices.
- Visual clarity:
  - XP gain float text on kill near player (example: `+8 XP`).
  - Keep XP bar copy explicit: "Kill enemies to fill XP".

### 2) Coin Economy
- Enemies continue to drop coin pickups (or direct coin gain on kill if clarity/testing says better).
- Coin value scales by enemy difficulty (simple mapping from enemy type/xpValue).
- Keep coin totals low enough to force prioritization.
- Do not add dynamic price scaling.

### 3) Shop Round Structure (Hades-Inspired Rhythm)
- Mid-run shop rounds:
  - Trigger on fixed cadence (proposed: every 3 waves).
  - Replace normal combat start moment with a shop decision window.
- Pre-boss shop:
  - Always trigger before boss wave starts.
  - Highest expected value decision point for saving vs spending.
- Shop interaction model:
  - Player can buy multiple items until choosing "Leave Shop".
  - No reroll spam by default (can be added later if economy supports it).

## Shop Inventory Design

### Item Categories
- `Upgrade/Boon` (randomized run power):
  - Main power lane.
  - Encourages adaptation over deterministic build forcing.
- `Healing`:
  - Expensive relative to value.
  - Safety purchase should feel costly.
- `Temporary Buff` (Well-style):
  - Strong short-duration effect (for next X waves/encounters).
  - Encourages tempo spending and discourages hoarding.
- `Progress Currency` (optional, later phase):
  - Only if we want "bad run still progresses" behavior in this game.

### Proposed Shop Slot Layout (v1)
- Slot A: Random upgrade (common/uncommon weighted).
- Slot B: Random upgrade (can roll rarer option at low chance).
- Slot C: Heal item.
- Slot D: Temporary buff.
- Slot E: Leave shop (free).

### Pricing (Fixed, v1 Proposal)
- Common upgrade: `10`
- Uncommon upgrade: `16`
- Legendary upgrade: `26`
- Heal: `14` to `22` depending on heal size
- Temporary buff: `12` to `20`
- Prices remain constant run-to-run.

## Temporary Buff Design (Initial Set)
- `Battle Surge`: +damage for next 2 waves.
- `Quick Hands`: +attack speed for next 2 waves.
- `Vacuum Pulse`: +pickup radius for next 2 waves.
- `Fortify`: small shield at next wave start only.

All temporary buffs:
- Expire automatically by wave count.
- Display remaining duration in HUD/shop recap.

## UX + Visual Plan
- HUD:
  - XP label text: "XP (from kills)".
  - Coin label always visible near level.
  - Optional "Next level in N XP".
- Pickups:
  - Keep coin pickup visuals distinct from XP (color + symbol + text tag).
- Shop should be in-world (not card modal):
  - Spawn a `Shop Zone` scene in arena for shop rounds.
  - Place 4-5 physical shop stands/pedestals with floating item holograms.
  - Player walks up to a stand and presses interact (`E` / gamepad confirm) to buy.
  - Unaffordable stands remain visible with red "NEED X COINS" signage.
  - One stand is always `Leave Shop`.

## In-World Shop Scene (Hades-Inspired, Game-Style)
- Interaction format:
  - No full-screen card picker for shop rounds.
  - Keep movement active only inside a small safe shop room/zone.
  - Purchases happen by proximity + interact prompt.
- Layout:
  - Merchant anchor point at top/center (stylized NPC/silhouette/terminal).
  - Item stands arranged in a semicircle around player approach path.
  - Clear lane for entering/exiting so flow feels deliberate.
- Visual language (match current game):
  - Neon grid floor and glitch shaders.
  - Pink/cyan/yellow holographic item icons above stands.
  - Price text in pixel font with glow outlines.
  - Subtle animated scanlines/particles on premium items.
- Readability:
  - Each stand shows: icon, category tag, fixed price, short effect text.
  - Nearby stand gets highlighted ring + interact key prompt.
  - Purchased stand becomes dimmed/empty state.

## Implementation Plan

### Phase 1: Progression Correction
- Remove passive XP gain logic.
- Restore kill-driven XP reward path.
- Keep coin drops from enemy deaths.
- Update HUD copy and pickup feedback for clarity.

### Phase 2: Shop Round Cadence
- Add explicit shop trigger points:
  - Every 3 waves.
  - Pre-boss guaranteed shop.
- Transition player into shop zone state.
- Disable enemy spawning/damage during shop zone.
- Exit shop zone on `Leave Shop`, then resume normal wave flow.

### Phase 3: Inventory + Effects
- Add categorized shop stock generation.
- Add healing + temporary buff purchasables.
- Add temporary effect tracking and expiration.
- Implement in-world stands with proximity interaction and purchase validation.

### Phase 4: Tuning Pass
- Tune reward rates and prices by playtest:
  - Average coin at wave 3, 6, pre-boss.
  - Average purchases per shop.
  - Survival delta when buying heal vs power.

## Technical Notes (Current Codebase Fit)
- Reuse existing `levelingUpPlayerId` pause channel with `upgradePromptType = shop`.
- Keep `UpgradeModal` and extend card metadata for category/cost/duration text.
- Use fixed-price table in engine; avoid hidden scaling logic.
- Keep local mode as first rollout, then mirror to host/server path.

## Acceptance Criteria
- XP only increases from kill events.
- Harder enemies measurably grant more XP than weaker ones.
- Shop appears at planned cadence and pre-boss.
- Shop includes at least: 2 upgrades, 1 heal, 1 temporary buff, leave option.
- Prices are fixed and visible.
- Unaffordable items are visible and non-purchasable.
- No runtime errors; build passes; gameplay test loop passes.

## Open Decisions (Need Your Call)
1. Shop cadence: every `3` waves or every `4` waves?
2. Purchases per shop: unlimited until leave (recommended) or exactly one?
3. Pre-boss shop: guaranteed always (recommended) or only if coins >= threshold?
4. Heal tuning style: one fixed heal item or two tiers (small/large)?
