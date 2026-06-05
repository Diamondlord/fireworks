const { test, expect } = require("@playwright/test");
const { trackPageErrors, clickCanvas, dragOnCanvas, finishDrag, gotoGame } = require("./helpers");

test.describe("ui", () => {
  test("day/night toggle updates icons, body class, and aria label", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await expect(page.locator("#icon-sun")).toHaveJSProperty("hidden", false);
    await expect(page.locator("#icon-moon")).toHaveJSProperty("hidden", true);
    await expect(page.locator("body")).not.toHaveClass(/day-mode/);
    await expect(page.locator("#daynight-btn")).toHaveAttribute("aria-label", "Switch to day");

    await page.locator("#daynight-btn").click();

    await expect(page.locator("#icon-sun")).toHaveJSProperty("hidden", true);
    await expect(page.locator("#icon-moon")).toHaveJSProperty("hidden", false);
    await expect(page.locator("body")).toHaveClass(/day-mode/);
    await expect(page.locator("#daynight-btn")).toHaveAttribute("aria-label", "Switch to night");

    errors.assertNoErrors();
  });

  test("custom cursor gets dragging class while drawing a trail", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await dragOnCanvas(page, 0.35, 0.45, 0.6, 0.55);
    await page.waitForFunction(() => window.__fireworksTest.pointerDragging());
    await expect(page.locator("#custom-cursor")).toHaveClass(/dragging/);

    await finishDrag(page);
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    await expect(page.locator("#custom-cursor")).not.toHaveClass(/dragging/);

    errors.assertNoErrors();
  });

  test("fullscreen button does not break canvas input", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await page.locator("#fullscreen-btn").click();
    await page.waitForTimeout(200);

    const before = await page.evaluate(() => window.__fireworksTest.particleCount());
    await clickCanvas(page, 0.5, 0.5);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
