# Character Unlock System

Spray 'n' Pray and True Melee are starters. Every other operator has one or two **unlock routes**, and completing **any** route unlocks it, so a player who only plays the Rift or only the Arena can still earn the whole roster.

## Routes

| Operator | Arena / shared route | Rift route |
|---|---|---|
| Boom Bringer | Defeat 3 bosses (any mode) | — |
| Turret Tina | Kill 500 enemies (any mode) | — |
| Vampire Vex | Reach wave 10 | Clear 4 stages in a single run |
| Dash Dynamo | Extract successfully 5 times | Earn an S rank on a stage |
| Glass Cannon Carl | Win without taking damage after wave 5 | Clear a stage without taking damage |
| Dachshund Dan (`pet-pal-percy`) | Survive 15 minutes in a single run | Open 3 secret stash chests |

Routes live on each character as `unlockRoutes` in `shared/characterConfig.ts` (`UnlockRoute` in `shared/types.ts`).

## Stats (`src/lib/progressionStorage.ts`)

`statValue()` maps each `UnlockStat` to a lifetime field on `PlayerProgression`:

- **Both modes:** `totalBossesDefeated`, `totalEnemiesKilled`
- **Arena only:** `highestWaveReached`, `bestSurvivalTimeMs`, `successfulExtractions`, `noHitAfterWave5Wins`, all recorded in `LocalGameEngine.saveGameStats`
- **Rift only:** `bestRiftStagesCleared`, `riftSRanks`, `riftFlawlessStages`, `riftSecretChests`. These are recorded as they happen through the `stageCleared` / `secretChestOpened` hooks in `ExplorationStage`, so an unlock can fire mid-run on the stage results screen.

Autoplay and debug-assisted runs record nothing.

## Flow

- `checkUnlocks()` applies every completed route and returns the newly unlocked types. The engine calls it after stat writes and forwards each new type to `setOnUnlockCallback`, which shows a toast in-game.
- `getUnlockProgress(type)` returns the progress on each route for the character-select card and the info panel.
- `getNearestUnlock(mode)` finds the locked route closest to completion, shown as "Next:" on the home screen's last-run card.

## Adding a route

1. Add the stat to `UnlockStat` and a field to `PlayerProgression` plus `DEFAULT_PROGRESSION`.
2. Map it in `statValue()` and record it where it happens (skip autoplay and `debugUsed`).
3. Add the route to the character's `unlockRoutes`.

Storage is versioned (`STORAGE_VERSION = 3`). Older saves merge in the new fields at zero and keep every character they had already unlocked.
