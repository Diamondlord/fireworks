const { test, expect } = require("@playwright/test");
const {
  trackPageErrors,
  getTestState,
  clickCanvas,
  dragOnCanvas,
  finishDrag,
  gotoGame,
} = require("./helpers");

test.describe("pointer edge cases", () => {
  test("mouseleave during drag resets pointer and canvas stays clickable", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await dragOnCanvas(page, 0.35, 0.45, 0.6, 0.55);
    await page.waitForFunction(() => window.__fireworksTest.pointerDragging());

    await page.locator("#canvas").dispatchEvent("mouseleave");
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    await page.mouse.up();

    const before = await getTestState(page);
    await clickCanvas(page, 0.45, 0.5);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    const state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });

  test("rain toggle during drag does not kill the script", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await dragOnCanvas(page, 0.3, 0.4, 0.55, 0.5);
    await page.waitForFunction(() => window.__fireworksTest.pointerDragging());

    await page.locator("#rain-btn").click();
    await finishDrag(page);

    let state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    expect(state.isRaining).toBe(true);

    const before = await getTestState(page);
    await clickCanvas(page, 0.5, 0.55);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });

  test("day/night toggle during drag does not kill the script", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await dragOnCanvas(page, 0.32, 0.42, 0.58, 0.52);
    await page.waitForFunction(() => window.__fireworksTest.pointerDragging());

    await page.locator("#daynight-btn").click();
    await finishDrag(page);

    let state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    expect(state.isDayMode).toBe(true);

    const before = await getTestState(page);
    await clickCanvas(page, 0.48, 0.48);
    await page.waitForFunction(
      (count) => window.__fireworksTest.arcCount() > count,
      before.arcCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
