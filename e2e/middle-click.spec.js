const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, getCanvasPoint, clickCanvas, gotoGame } = require("./helpers");

test.describe("middle click", () => {
  test("middle click spawns a golden ring burst", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    const point = await getCanvasPoint(page, 0.5, 0.5);
    const before = await getTestState(page);

    await page.mouse.click(point.x, point.y, { button: "middle" });

    await page.waitForFunction(
      (kind) => window.__fireworksTest.lastBurstKind() === kind,
      "golden",
      { timeout: 3000 }
    );
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    const state = await getTestState(page);
    expect(state.lastBurstKind).toBe("golden");
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });

  test("left click still works after middle click", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    const point = await getCanvasPoint(page, 0.45, 0.55);
    await page.mouse.click(point.x, point.y, { button: "middle" });
    await page.waitForFunction(
      (kind) => window.__fireworksTest.lastBurstKind() === kind,
      "golden",
      { timeout: 3000 }
    );

    const before = await getTestState(page);
    await clickCanvas(page, 0.6, 0.4);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
