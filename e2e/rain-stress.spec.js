const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, clickCanvas, gotoGame } = require("./helpers");

test.describe("rain stress", () => {
  test("rapid canvas clicks while raining stay responsive", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#rain-btn").click();
    let state = await getTestState(page);
    expect(state.isRaining).toBe(true);

    const offsets = [
      [0.3, 0.35],
      [0.5, 0.4],
      [0.7, 0.45],
      [0.4, 0.55],
      [0.6, 0.6],
      [0.35, 0.5],
      [0.65, 0.35],
      [0.5, 0.65],
    ];

    for (const [offsetX, offsetY] of offsets) {
      await clickCanvas(page, offsetX, offsetY);
      await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    }

    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    expect(state.isRaining).toBe(true);

    await page.locator("#daynight-btn").click();
    state = await getTestState(page);
    expect(state.isDayMode).toBe(true);

    errors.assertNoErrors();
  });
});
