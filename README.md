# Fireworks & Rainbows

A simple browser game for young kids — **no text on screen**. Click the sky, change the weather, switch day and night. Built for learning left click vs right click through different visuals and sounds.

## Play online

[https://diamondlord.github.io/fireworks/](https://diamondlord.github.io/fireworks/)

## How to run locally

1. Open `index.html` in Chrome or Safari (double-click, or drag into the browser).
2. Click once anywhere if sound does not play — browsers require a user gesture for audio.
3. For fullscreen, tap the expand button on the right.

No install or build step.

## Development / testing

End-to-end tests use [Playwright](https://playwright.dev/) and run automatically in GitHub Actions on pull requests and pushes to `main`.

```bash
npm install
npm run test:e2e        # headless
npm run test:e2e:ui     # interactive debugger
```

## Buttons (right side)

| Button | Where | What it does |
|---|---|---|
| Fullscreen | Top (small) | Hide browser bars |
| Sun / moon | Upper stack (big) | Switch day ↔ night |
| Rain | Middle stack (big) | Toggle rain on/off (lights up blue when on) |
| Stars / clouds | Lower stack (big) | Night: constellation appears · Day: cloud shape forms (tap again to add more) |

## Modes

**Night** — dark sky, twinkling stars, moon, fireworks, fireflies near the bottom. A wandering star may drift by; rarely, a shooting star streaks across. **Winter:** gentle snow drift. Cursor: ✨ (grows while dragging)

**Day** — blue sky, drifting clouds, sun, rainbow arcs. A butterfly may flutter by sometimes. Stop rain to see a soft rainbow. **Spring:** petals drift · **Fall:** leaves drift. Cursor: 🦋 (grows while dragging)

**Rain** (either mode) — falling drops + rain sound. At night, an occasional gentle lightning flash. Cursor: 🦄

The sky palette shifts automatically with the season (winter / spring / summer / fall).

## Controls

| Action | Night | Day |
|---|---|---|
| Left click / tap | Firework burst (random size & shape: normal, willow, ring, or heart) | Rainbow arc at click (random size & shape) |
| Right click / **long-press** (~½ sec) | Rainbow ring burst | Extra-big rainbow |
| Drag + release | Glowing dots → fireworks pop **one by one** along the trail (finish whoosh at the end) | Glowing dots → rainbows grow **one by one** along the trail |
| Rain button | Rain on/off | Rain on/off |
| Stars / clouds button | Spawn a constellation (stars connect, then glow with chimes) | Spawn a cloud (puffs merge, then sunny glow) |

Trail tips: draw a line, release, wait a moment — effects ripple along the path with sound. Single clicks work anywhere on the sky. On iPad, hold your finger still for the special rainbow burst (a ring grows while you wait).

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, canvas, buttons |
| `style.css` | Layout, floating buttons, custom cursor |
| `fireworks.js` | Sky, particles, rainbows, rain, sound, input |

## Customize

Edit `fireworks.js` — burst sizes (`BURST_SIZES`), rainbow sizes (`ARC_RADIUS_RANGE`), trail timing (`PLAN_STAGGER_DELAY`), seasonal sky palettes (`SEASON_PALETTES`), colors, and sound volumes.
