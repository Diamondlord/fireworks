# Fireworks & Rainbows

A no-text browser game for young kids. Stamp a picture, press Play, then click the sky. Kids learn drag-and-drop first, then left click vs right click, through different visuals and sounds.

**Play:** [https://diamondlord.github.io/fireworks/](https://diamondlord.github.io/fireworks/)  
**Source:** [https://github.com/Diamondlord/fireworks](https://github.com/Diamondlord/fireworks)

## How to run locally

1. Open `index.html` in Chrome or Safari (double-click, or drag into the browser).
2. Click once anywhere if sound does not play — browsers require a user gesture for audio.
3. For fullscreen, tap the expand button on the right.

No install or build step.

## How to play

The game opens in **compose**.

1. Tap a stamp in the bottom tray (it lights up), then tap the sky — or drag the stamp onto the sky.
2. Drag a placed stamp to move it. Tap the trash, then tap one stamp to erase just that stamp (or drag a stamp onto the trash).
3. Press **Play** on the right. The picture wakes up, and fireworks / rainbows work on top of it.
4. Press Play again to pause and keep arranging.

Empty Play (no stamps) is still the original fireworks game.

## Stamp tray

| Stamp | Play motion | Tap in Play |
|---|---|---|
| Star | Twinkle | Firework |
| Moon | Drift | Golden ring |
| Sun | Spin | Golden ring |
| Heart | Beat | Heart burst |
| Rainbow | Shimmer | Big rainbow |
| Butterfly | Flutter | Rainbow arc |
| Bee | Buzz | Sparkles |
| Bird | Flap | Firework |
| Cloud | Drift | Sparkles |
| Balloon | Float | Pop sparkles |
| Tree | Sway | Sparkles |
| Mushroom | Bob | Sparkles |
| Unicorn | Prance | Rainbow ring |
| Rocket | Climb | Firework |
| Flower | Sway | Sparkles |
| Trash | — | Tap a stamp to erase only that one |

Flowers, balloons, butterflies, hearts, birds, bees, trees, mushrooms, and stars pick a random color each time you place them.

## Buttons (right side)

| Button | What it does |
|---|---|
| Fullscreen | Hide browser bars |
| Play / pause | Wake the picture and unlock fireworks (green when playing) |
| Sun / moon | Switch day ↔ night |
| Rain | Rain on/off (blue when on) |
| Stars / clouds | Night: constellation · Day: cloud shape (tap again to add more) |

Day / night / rain still work in both compose and play. Stamps stay in the picture when the sky changes.

## Sky modes

**Night** — dark sky, twinkling stars, moon, fireworks, fireflies. A wandering star may drift by; rarely, a shooting star streaks across. **Winter:** snow. Cursor: ✨

**Day** — blue sky, clouds, sun, rainbows. A butterfly may flutter by. Stop rain to see a soft rainbow. **Spring:** petals · **Fall:** leaves. Cursor: 🦋

**Rain** — drops + rain sound. At night, a gentle lightning flash. Cursor: 🦄

The sky palette follows the season (winter / spring / summer / fall).

## Controls (while playing)

| Action | Night | Day |
|---|---|---|
| Left click / tap | Firework (normal, willow, ring, or heart) | Rainbow arc |
| Double-click / double-tap | Mega rainbow ring | Mega rainbow shatters into falling colors |
| Right click / long-press (~½ sec) | Rainbow ring | Double rainbow |
| Middle click | Golden ring + bell | Golden ring + bell |
| Drag + release | Dots → fireworks pop one by one | Dots → rainbows grow one by one |
| Drag while raining (night) | Lightning trail + crackle | Same rainbow trail as dry day |
| After rain stops | Next 3 clicks get extra sparkles | Next 3 clicks get extra sparkles |

On iPad, hold a finger still for the special rainbow burst (a ring grows while you wait).

## Development / testing

```bash
npm install
npm run test:e2e        # headless Playwright
npm run test:e2e:ui     # interactive debugger
```

Tests run in GitHub Actions on pull requests and pushes to `main`. The site deploys to GitHub Pages from `main`.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, canvas, toolbar, stamp tray |
| `style.css` | Layout, buttons, cursor |
| `fireworks.js` | Sky, particles, rainbows, rain, stamps, sound, input |
| `e2e/` | Playwright specs |

## Customize

Edit `fireworks.js` — burst sizes (`BURST_SIZES`), rainbow sizes (`ARC_RADIUS_RANGE`), trail timing (`PLAN_STAGGER_DELAY`), seasonal palettes (`SEASON_PALETTES`), stamp colors (`pickStickerHues`), and sound volumes.
