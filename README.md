# Fireworks & Rainbows

A simple browser game for young kids — **no text on screen**. Click the sky, change the weather, switch day and night. Built for learning left click vs right click through different visuals and sounds.

**Play online:** [https://diamondlord.github.io/fireworks/](https://diamondlord.github.io/fireworks/)

## How to run locally

1. Open `index.html` in Chrome or Safari (double-click, or drag into the browser).
2. Click once anywhere if sound does not play — browsers require a user gesture for audio.
3. For fullscreen, tap the expand button on the right.

No install or build step.

## Buttons (right side)

| Button | Where | What it does |
|---|---|---|
| Sun / moon | Middle-right (big) | Switch day ↔ night |
| Rain | Below sun/moon (big) | Toggle rain on/off (lights up blue when on) |
| Fullscreen | Top-right (small) | Hide browser bars |

## Modes

**Night** — dark sky, stars, moon, fireworks. Cursor: ✨

**Day** — blue sky, clouds, sun, rainbow arcs. Cursor: 🦋

**Rain** (either mode) — falling drops + rain sound. Cursor: 🦄

## Controls

| Action | Night | Day |
|---|---|---|
| Left click / tap | One-color firework (random size) | Rainbow arc at click (random size & shape) |
| Right click | Rainbow ring burst | Big double rainbow |
| Drag + release | Glowing dots → fireworks pop **one by one** along the trail | Glowing dots → rainbows grow **one by one** along the trail |
| Rain button | Rain on/off | Rain on/off |

Trail tips: draw a line, release, wait a moment — effects ripple along the path with sound. Single clicks work anywhere on the sky.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, canvas, buttons |
| `style.css` | Layout, floating buttons, custom cursor |
| `fireworks.js` | Sky, particles, rainbows, rain, sound, input |

## Deploy (GitHub Pages)

Pushes to `main` deploy via GitHub Actions (`.github/workflows/pages.yml`).

One-time: repo **Settings → Pages → Source → GitHub Actions**.

## Customize

Edit `fireworks.js` — burst sizes (`BURST_SIZES`), rainbow sizes (`ARC_RADIUS_RANGE`), trail timing (`PLAN_STAGGER_DELAY`), colors, and sound volumes.
