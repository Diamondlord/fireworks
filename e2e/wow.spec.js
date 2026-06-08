const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, rightClickCanvas, gotoGame } = require("./helpers");

test.describe("wow burst", () => {
  test("right click at night spawns a rainbow ring burst", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    const before = await getTestState(page);
    expect(before.isDayMode).toBe(false);

    await rightClickCanvas(page, 0.5, 0.5);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    const state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });

  test("right click in day mode spawns a double rainbow", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#daynight-btn").click();
    const before = await getTestState(page);
    expect(before.isDayMode).toBe(true);

    await rightClickCanvas(page, 0.45, 0.5);
    await page.waitForFunction(
      (count) => window.__fireworksTest.arcCount() >= count + 2,
      before.arcCount,
      { timeout: 3000 }
    );

    let state = await getTestState(page);
    expect(state.lastBurstKind).toBe("wow");
    expect(state.pointerActive).toBe(false);

    const cascadeBefore = state.lastCascadeAt;
    await page.waitForTimeout(1000);
    state = await getTestState(page);
    expect(state.lastCascadeAt).toBe(cascadeBefore);

    errors.assertNoErrors();
  });
});
