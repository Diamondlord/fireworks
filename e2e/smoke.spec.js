const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState } = require("./helpers");

test.describe("smoke", () => {
  test("loads the game and toolbar", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await expect(page).toHaveTitle("Fireworks");
    await expect(page.locator("#canvas")).toBeVisible();
    await expect(page.locator("#fullscreen-btn")).toBeVisible();
    await expect(page.locator("#daynight-btn")).toBeVisible();
    await expect(page.locator("#rain-btn")).toBeVisible();
    await expect(page.locator("#constellation-btn")).toBeVisible();

    const hookReady = await page.evaluate(
      () => typeof window.__fireworksTest?.particleCount === "function"
    );
    expect(hookReady).toBe(true);

    const state = await getTestState(page);
    expect(state.isDayMode).toBe(false);
    expect(state.isRaining).toBe(false);
    expect(state.pointerActive).toBe(false);

    errors.assertNoErrors();
  });
});
