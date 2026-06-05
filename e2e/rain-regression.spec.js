const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, clickCanvas } = require("./helpers");

test.describe("rain regression", () => {
  test("rain toggle and canvas clicks keep working", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await page.waitForFunction(() => window.__fireworksTest);

    await page.locator("#rain-btn").click();
    let state = await getTestState(page);
    expect(state.isRaining).toBe(true);
    await expect(page.locator("#rain-btn")).toHaveClass(/active/);

    const beforeBurst = await getTestState(page);
    await clickCanvas(page);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      beforeBurst.particleCount,
      { timeout: 3000 }
    );
    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);

    await page.locator("#daynight-btn").click();
    state = await getTestState(page);
    expect(state.isDayMode).toBe(true);

    const beforeCloud = await getTestState(page);
    await page.locator("#constellation-btn").click();
    await page.waitForFunction(
      (count) => window.__fireworksTest.cloudShapeCount() > count,
      beforeCloud.cloudShapeCount,
      { timeout: 3000 }
    );

    await page.locator("#rain-btn").click();
    state = await getTestState(page);
    expect(state.isRaining).toBe(false);
    await expect(page.locator("#rain-btn")).not.toHaveClass(/active/);

    const beforeArc = await getTestState(page);
    await clickCanvas(page, 0.4, 0.45);
    await page.waitForFunction(
      (count) => window.__fireworksTest.arcCount() > count,
      beforeArc.arcCount,
      { timeout: 3000 }
    );
    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);

    errors.assertNoErrors();
  });
});
