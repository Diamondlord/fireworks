const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, dragOnCanvas, finishDrag, gotoGame } = require("./helpers");

test.describe("day mode trail", () => {
  test("day mode drag trail adds plan markers and resets pointer", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#daynight-btn").click();
    let state = await getTestState(page);
    expect(state.isDayMode).toBe(true);

    const before = await getTestState(page);
    await dragOnCanvas(page, 0.3, 0.4, 0.65, 0.55);
    await page.waitForFunction(
      (count) => window.__fireworksTest.planMarkerCount() > count,
      before.planMarkerCount,
      { timeout: 3000 }
    );

    await finishDrag(page);
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());

    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    expect(state.planMarkerCount).toBeGreaterThan(before.planMarkerCount);

    errors.assertNoErrors();
  });
});
