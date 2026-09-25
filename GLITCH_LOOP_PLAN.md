# The Glitch Loop

- Straight in: after you pick a character you drop directly into Stage 1. There's no map screen at all. Each stage is a new huge biome world.
- Carries over between stages: your level, items and coins, plus the danger clock (EASY → HAHAHAHA), which never resets, like Risk of Rain 2.

## Clearing a stage

- **Boss relics**: once the anchor is stabilised, 3 relics appear on pedestals. You walk onto one to take it, as in Binding of Isaac, and the other two vanish.
- **Stage clear rank**: an S/A/B/C/D rank slams onto the screen with bonus coins, based on kills, best combo, items, damage taken and time.
- **3 rift portals**: each floats a card showing the next stage's twist, with a reward and a risk. You walk into one to choose.

## Stage twists

There are 7:

- Gold Rush
- Blood Moon (elites everywhere, elites can drop items)
- Overclock
- Treasure Room (pick 1 of 3 legendaries when you land)
- Black Market (a shop on pedestals)
- Curse of the Dark (you can only see around you, but chests drop double)
- Horde Night

## Secret rooms

Each stage hides 1–2. Look for a cracked, glinting wall and shoot it open for a sealed vault and a "SECRET FOUND!" moment.

## Run summary

When you die you get a pixel-style screen with stages cleared, time, kills, best combo and every item you collected, plus "Run it back" and "Menu" buttons.

## Two other changes

- **Normal route map**: the redesign that was started has been dropped. Normal runs keep their existing route map unchanged.
- **World polish** (done): the biomes had looked empty because obstacle placement was broken (positions all piled into one corner, and footprints were checked with an oversized radius). Obstacle cover is now 4–10% in most biomes (about 16% in the arcade). Decor is about 3× denser, floors have textures, hazards are proper lava/goo/ice/warp pools, and full-map labels sit on backed tags. Secret rooms are carved out before obstacles are placed, and world generation takes about 85ms, down from about 230ms.

## Notes

- Character select with everything unlocked for the Playground was already added in the last commit.
- Every character has been checked in the open world (done). `scripts/verify_characters_open_world.mjs` drops all 8 characters into a different dense biome with an enemy pack and drives them with real keyboard input (move, fire, Shift blink, Q ability). All 8 move, deal damage and get kills with no page errors. `CHARACTERS=all node scripts/playtest_exploration.mjs` runs the playtest bot as every character.
- Fixed during the check:
  - The shared enemy/boss navigator could dead-end while hugging small obstacles. Stalls fell from 8/300 to 0 outside sealed pockets.
  - Portal-card text overlapped. Cards are now measured, and cards for north portals sit beside them.
  - The Black Market heal pedestal overlapped a shop pedestal.
  - The "walk into a rift" prompt showed twice and wrongly showed the E key.
  - Banners drew on top of the run summary.
  - A 4px strip of the settings drawer peeked in at the top of the screen.
