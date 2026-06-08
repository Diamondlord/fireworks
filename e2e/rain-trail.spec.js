const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, dragOnCanvas, finishDrag, gotoGame } = require("./helpers");

test.describe("rain lightning trail", () => {
  test("night rain drag uses lightning plan markers", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#rain-btn").click();
    let state = await getTestState(page);
    expect(state.isDayMode).toBe(false);
    expect(state.isRaining).toBe(true);

    await dragOnCanvas(page, 0.3, 0.4, 0.65, 0.55);
    await page.waitForFunction(() => window.__fireworksTest.hasLightningMarkers());

    state = await getTestState(page);
    expect(state.hasLightningMarkers).toBe(true);
    expect(state.planMarkerCount).toBeGreaterThan(0);

    await finishDrag(page);
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());

    state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });

  test("dry night drag uses normal plan markers", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await dragOnCanvas(page, 0.32, 0.42, 0.6, 0.52);
    await page.waitForFunction(() => window.__fireworksTest.planMarkerCount() > 0);

    const state = await getTestState(page);
    expect(state.hasLightningMarkers).toBe(false);

    await finishDrag(page);
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    errors.assertNoErrors();
  });
});
