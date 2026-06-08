const { expect } = require("@playwright/test");

function trackPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    assertNoErrors() {
      expect(errors, errors.join("\n")).toEqual([]);
    },
  };
}

async function getTestState(page) {
  return page.evaluate(() => ({
    isRaining: window.__fireworksTest.isRaining(),
    isDayMode: window.__fireworksTest.isDayMode(),
    pointerActive: window.__fireworksTest.pointerActive(),
    pointerDragging: window.__fireworksTest.pointerDragging(),
    particleCount: window.__fireworksTest.particleCount(),
    arcCount: window.__fireworksTest.arcCount(),
    planMarkerCount: window.__fireworksTest.planMarkerCount(),
    constellationCount: window.__fireworksTest.constellationCount(),
    cloudShapeCount: window.__fireworksTest.cloudShapeCount(),
    audioState: window.__fireworksTest.audioState(),
    seasonKey: window.__fireworksTest.seasonKey(),
    driftKind: window.__fireworksTest.driftKind(),
    lastBurstKind: window.__fireworksTest.lastBurstKind(),
    postRainBonusLeft: window.__fireworksTest.postRainBonusLeft(),
    hasLightningMarkers: window.__fireworksTest.hasLightningMarkers(),
    lastCascadeAt: window.__fireworksTest.lastCascadeAt(),
  }));
}

async function getCanvasPoint(page, offsetX = 0.5, offsetY = 0.5) {
  const canvas = page.locator("#canvas");
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box.x + box.width * offsetX,
    y: box.y + box.height * offsetY,
  };
}

async function clickCanvas(page, offsetX = 0.5, offsetY = 0.5) {
  const point = await getCanvasPoint(page, offsetX, offsetY);
  await page.mouse.click(point.x, point.y);
}

async function rightClickCanvas(page, offsetX = 0.5, offsetY = 0.5) {
  const point = await getCanvasPoint(page, offsetX, offsetY);
  await page.mouse.click(point.x, point.y, { button: "right" });
}

async function dragOnCanvas(page, startX = 0.35, startY = 0.45, endX = 0.55, endY = 0.55) {
  const start = await getCanvasPoint(page, startX, startY);
  const end = await getCanvasPoint(page, endX, endY);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 10 });
  return { start, end };
}

async function finishDrag(page) {
  await page.mouse.up();
}

async function gotoGame(page) {
  await page.goto("/");
  await page.waitForFunction(() => window.__fireworksTest);
}

module.exports = {
  trackPageErrors,
  getTestState,
  getCanvasPoint,
  clickCanvas,
  rightClickCanvas,
  dragOnCanvas,
  finishDrag,
  gotoGame,
};
