const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, clickCanvas, gotoGame } = require("./helpers");

test.describe("toolbar input", () => {
  test("toolbar buttons do not break canvas clicks", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#fullscreen-btn").click();
    await page.locator("#daynight-btn").click();
    await page.locator("#rain-btn").click();
    await page.locator("#constellation-btn").click();
    await page.locator("#rain-btn").click();
    await page.locator("#daynight-btn").click();

    let state = await getTestState(page);
    expect(state.pointerActive).toBe(false);

    const before = await getTestState(page);
    await clickCanvas(page, 0.5, 0.5);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });
});
