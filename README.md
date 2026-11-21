[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/zairzuab/best-stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/zairzuab/best-stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# The Cinder Library — a stealth heist

A complete top-down stealth game that plays offline in a desktop browser.
You are a thief in a moonlit library. Steal the Star of Auralia from each
of three floors and slip out the east door unseen.

**Play it:** serve `game/` with any static server (`node serve.ts`, then
open http://localhost:8080) and press Enter.

## How it plays

- **Wardens with vision cones** — patrol waypoints, pause and scan. A cone
  is pale gold while they patrol, amber while they wonder, red while they
  chase. Shelves and walls block their sight.
- **Suspicion, not instant failure** — being seen fills a guard's suspicion.
  At half they walk over to look; at full they chase. Break line of sight
  and they search, then calm down and walk home.
- **Noise** — running is fast and loud; wardens in earshot come to look.
  Sneaking is slow and quiet. A thrown pebble (click or Q) clinks on the
  floor and pulls every warden nearby over to investigate.
- **Hiding** — shadow pools make you hard to see; ferns hide a sneaking
  thief completely. Lamplight does the opposite: it shows you up.
- **Three floors** — the Reading Room, the Stacks, the Vault of Embers.
  Nine, nine and eleven relics to steal, plus the Star on each floor. The
  exit stays locked until the Star is yours. Three attempts per run, a
  4-minute sweep timer per floor, and a score for relics, the Star and
  remaining time.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak (quiet, hidden in ferns) |
| Space | Run (fast, loud) |
| Click / Q | Throw a pebble lure at the cursor |
| M | Mute |
| R | Restart the floor |
| Enter | Start / play again |

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.
- `game/index.html` — the page; `game/style.css` — the frame.
- `game/src/main.js` — game loop, screens, scoring, demo scenes.
- `game/src/levels.js` — the three floors: tile maps, patrols, lanterns.
- `game/src/vision.js` — line of sight and vision-cone geometry.
- `game/src/guards.js` — warden AI: patrol, suspicion, chase, search.
- `game/src/pathfind.js` — breadth-first search through the aisles.
- `game/src/player.js` — movement, noise, hiding, the pebble lure.
- `game/src/render.js` — all drawing: floor, cones, HUD, title screen.
- `game/src/audio.js` — synthesized WebAudio effects, no audio files.
- `screenshots/` — four real renders of the game in a browser.

All art and sound are original and generated in code; no assets are
downloaded and the game makes no network request.

## Entry

Built for the [make.fun bounty "Make the best stealth game"](https://make.fun/bounty/best-stealth-game-20261121-1759)
(`best-stealth-game-20261121-1759`). MIT licensed.
