const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, clickCanvas } = require("./helpers");

test.describe("interactions", () => {
  test("night mode canvas click spawns fireworks", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await page.waitForFunction(() => window.__fireworksTest);

    const before = await getTestState(page);
    expect(before.isDayMode).toBe(false);

    await clickCanvas(page);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });

  test("day mode canvas click spawns rainbow arcs", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await page.waitForFunction(() => window.__fireworksTest);
    await page.locator("#daynight-btn").click();

    const before = await getTestState(page);
    expect(before.isDayMode).toBe(true);

    await clickCanvas(page, 0.55, 0.4);
    await page.waitForFunction(
      (count) => window.__fireworksTest.arcCount() > count,
      before.arcCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });

  test("night mode drag trail finishes and resets pointer", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await page.waitForFunction(() => window.__fireworksTest);

    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.45;
    const endX = startX + 80;
    const endY = startY + 40;

    const before = await getTestState(page);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 5000 }
    );

    const after = await getTestState(page);
    expect(after.pointerActive).toBe(false);

    errors.assertNoErrors();
  });

  test("constellation button adds a sky pattern at night", async ({ page }) => {
    const errors = trackPageErrors(page);

    await page.goto("/");
    await page.waitForFunction(() => window.__fireworksTest);

    const before = await getTestState(page);
    expect(before.isDayMode).toBe(false);

    await page.locator("#constellation-btn").click();
    await page.waitForFunction(
      (count) => window.__fireworksTest.constellationCount() > count,
      before.constellationCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
