# Enemy Stats Table

## Base Roster Stats

| Enemy | Unlock | Base HP | Base Damage | Base Speed | Base XP | Spawn Weight | Signature |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `grunt` | Wave 1 | 20 | 5 | 2.0 | 5 | 1.0 | Simple melee chase |
| `slugger` | Wave 1 | 30 | 3 | 1.0 | 8 | 0.45 | Strafes while holding ranged standoff |
| `hellhound` | Special round only | 40 | 8 | 4.0 | 15 | 0.0 | Alpha-led pack rushes |
| `splitter` | Wave 6 | 35 | 6 | 1.5 | 12 | 0.4 | Splits into 2-3 minis on death |
| `mini-splitter` | Spawned only | 10 | 3 | 1.8 | 2 | 0.0 | Fast cleanup swarm |
| `glitch-spider` | Wave 4 | 15 | 4 | 3.5 | 6 | 0.5 | Latches onto players |
| `neon-pulse` | Wave 8 | 50 | 10 | 1.2 | 20 | 0.3 | Pulse telegraph plus unsafe ground |
| `tank-bot` | Wave 13 | 120 | 15 | 0.8 | 30 | 0.2 | Telegraphs and charges through players |

## Scaling Multipliers

| Enemy | Health | Damage | Speed | XP | Extra Scaling |
| --- | ---: | ---: | ---: | ---: | --- |
| `grunt` | 1.30 | 1.20 | 1.05 | 1.15 | None |
| `slugger` | 1.40 | 1.15 | 1.03 | 1.20 | Attack speed `0.95x` per wave |
| `hellhound` | 1.15 | 1.10 | 1.02 | 1.30 | Pack behavior, no normal-wave spawn |
| `splitter` | 1.35 | 1.20 | 1.04 | 1.25 | Death split count stays `2-3` |
| `mini-splitter` | 1.35 | 1.20 | 1.04 | 1.25 | Inherits parent scaling |
| `glitch-spider` | 1.20 | 1.20 | 1.08 | 1.20 | Latch mechanic is the real threat |
| `neon-pulse` | 1.40 | 1.30 | 1.05 | 1.30 | Attack speed `0.90x` per wave |
| `tank-bot` | 1.60 | 1.40 | 1.02 | 1.50 | Charge pattern does the displacement work |

## Behavior Timings

| Enemy | Timing | Value |
| --- | --- | --- |
| `slugger` | Strafe swap | `1250-2200ms` |
| `slugger` | Preferred range | `245px` |
| `slugger` | Base shot cooldown | `2500ms` |
| `neon-pulse` | Preferred range | `230px` |
| `neon-pulse` | Base shot cooldown | `3000ms` |
| `neon-pulse` | Pulse telegraph | `900ms` |
| `neon-pulse` | Pulse zone duration | `2600ms` |
| `tank-bot` | Charge telegraph | `700ms` |
| `tank-bot` | Charge duration | `650ms` |
| `tank-bot` | Charge speed floor | `7.5` |
| `hellhound` | Pack spawn size | `3-5` |
| `hellhound` | Pack speed boost | `1.35x` |

## Wave Snapshots

### Grunt

| Wave | HP | Damage | Speed | XP |
| --- | ---: | ---: | ---: | ---: |
| 1 | 20 | 5 | 2.00 | 5 |
| 3 | 34 | 7 | 2.21 | 7 |
| 5 | 57 | 10 | 2.43 | 9 |
| 10 | 206 | 26 | 3.10 | 18 |

### Slugger

| Wave | HP | Damage | Speed | XP | Attack CD |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 30 | 3 | 1.00 | 8 | 2500ms |
| 3 | 59 | 4 | 1.06 | 12 | 2256ms |
| 5 | 115 | 5 | 1.13 | 17 | 2036ms |
| 8 | 316 | 8 | 1.23 | 29 | 1746ms |

## Threat Notes

- `grunt`: cheapest pressure unit; makes every other enemy matter by occupying space.
- `slugger`: now creates side-angle projectile pressure instead of only frontal pressure.
- `hellhound`: strongest when the alpha survives long enough for flanking angles to form.
- `splitter`: effective HP is higher than the table suggests because death creates more bodies.
- `glitch-spider`: real danger is the attachment, not its listed damage.
- `neon-pulse`: area denial makes the arena state part of the fight.
- `tank-bot`: displacement is usually more dangerous than the damage value.

## Reading Late Unlocks

Late enemies look extreme if you plug their unlock wave into the scaling formula directly. That is intentional: they are not meant to feel like sidegrades when they first appear.

The roster escalation is:

- early waves: `grunt`, `slugger`
- first disruption layer: `glitch-spider`
- kill-order pressure: `splitter`
- arena-control pressure: `neon-pulse`
- positional punishment: `tank-bot`
