const { test, expect, devices } = require("@playwright/test");
const { trackPageErrors, getTestState, gotoGame } = require("./helpers");

test.use({
  ...devices["Pixel 5"],
});

test.describe("touch input", () => {
  test("touch drag trail works on mobile viewport", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.45;
    const endX = startX + 90;
    const endY = startY + 50;

    const before = await getTestState(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 5000 }
    );

    const state = await getTestState(page);
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });
});
