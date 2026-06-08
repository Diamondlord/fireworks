const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, clickCanvas, gotoGame } = require("./helpers");

test.describe("post rain reward", () => {
  test("turning rain off grants three bonus clicks", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#rain-btn").click();
    let state = await getTestState(page);
    expect(state.isRaining).toBe(true);
    expect(state.postRainBonusLeft).toBe(0);

    await page.locator("#rain-btn").click();
    state = await getTestState(page);
    expect(state.isRaining).toBe(false);
    expect(state.postRainBonusLeft).toBe(3);

    await clickCanvas(page, 0.5, 0.5);
    await page.waitForFunction(() => window.__fireworksTest.postRainBonusLeft() === 2);

    await clickCanvas(page, 0.45, 0.55);
    await page.waitForFunction(() => window.__fireworksTest.postRainBonusLeft() === 1);

    await clickCanvas(page, 0.55, 0.45);
    await page.waitForFunction(() => window.__fireworksTest.postRainBonusLeft() === 0);

    await page.locator("#daynight-btn").click();
    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);

    errors.assertNoErrors();
  });

  test("turning rain on clears the bonus counter", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#rain-btn").click();
    await page.locator("#rain-btn").click();
    let state = await getTestState(page);
    expect(state.postRainBonusLeft).toBe(3);

    await page.locator("#rain-btn").click();
    state = await getTestState(page);
    expect(state.postRainBonusLeft).toBe(0);

    errors.assertNoErrors();
  });
});
