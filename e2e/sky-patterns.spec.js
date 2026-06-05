const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, gotoGame } = require("./helpers");

test.describe("sky patterns", () => {
  test("constellation button stacks multiple patterns at night", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#constellation-btn").click();
    await page.waitForFunction(() => window.__fireworksTest.constellationCount() === 1);

    await page.locator("#constellation-btn").click();
    await page.waitForFunction(() => window.__fireworksTest.constellationCount() === 2);

    const state = await getTestState(page);
    expect(state.constellationCount).toBe(2);
    errors.assertNoErrors();
  });

  test("cloud button stacks multiple patterns in day mode", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#daynight-btn").click();
    let state = await getTestState(page);
    expect(state.isDayMode).toBe(true);

    await page.locator("#constellation-btn").click();
    await page.waitForFunction(() => window.__fireworksTest.cloudShapeCount() === 1);

    await page.locator("#constellation-btn").click();
    await page.waitForFunction(() => window.__fireworksTest.cloudShapeCount() === 2);

    state = await getTestState(page);
    expect(state.cloudShapeCount).toBe(2);
    errors.assertNoErrors();
  });
});
