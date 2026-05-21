# Fireworks

A simple click-and-play fireworks game for kids. Open in a browser, click or tap anywhere on the night sky, and watch colorful bursts light up the screen.

## How to play

1. Open `index.html` in Chrome, Safari, or Firefox (double-click the file, or drag it into a browser window).
2. Click or tap anywhere to create fireworks.
3. Use the button in the top-right corner to go fullscreen.

Each click creates a burst in a **different random color**. Bursts vary in size — some small, some big — with sparkles and a gentle pop sound.

## Tips

- **Sound**: Browsers require a click before playing audio. The first tap enables sound automatically.
- **Tablet**: Works on iPad and other touch devices — tap anywhere like you would with a mouse.
- **Fullscreen**: Click the expand icon (top-right) for an immersive view without browser bars.

## Customize

Edit `fireworks.js` to tweak the experience:

- **Colors**: Search for `baseHue` and `hsla` — adjust saturation/lightness values.
- **Burst sizes**: Change `BURST_SIZES` (particle count and speed).
- **Night sky**: Edit gradient colors in `buildSky()` (`#0d1033`, `#020208`).
- **Sound volume**: Adjust `volume` values in `playPopSound()`.

No install or build step required — just edit and refresh the browser.
