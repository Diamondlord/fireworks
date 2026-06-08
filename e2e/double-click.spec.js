const { test, expect } = require("@playwright/test");
const { trackPageErrors, getTestState, getCanvasPoint, clickCanvas, gotoGame } = require("./helpers");

test.describe("double click", () => {
  test("two quick clicks trigger a mega burst at night", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    const point = await getCanvasPoint(page, 0.5, 0.5);
    const before = await getTestState(page);

    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(80);
    await page.mouse.click(point.x, point.y);

    await page.waitForFunction(
      (kind) => window.__fireworksTest.lastBurstKind() === kind,
      "mega",
      { timeout: 3000 }
    );
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    const state = await getTestState(page);
    expect(state.lastBurstKind).toBe("mega");
    expect(state.pointerActive).toBe(false);
    errors.assertNoErrors();
  });

  test("single click stays a normal burst", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);

    await clickCanvas(page, 0.42, 0.48);
    await page.waitForFunction(
      (kind) => window.__fireworksTest.lastBurstKind() === kind,
      "normal",
      { timeout: 3000 }
    );

    const state = await getTestState(page);
    expect(state.lastBurstKind).toBe("normal");
    errors.assertNoErrors();
  });

  test("double click in day mode triggers mega cascade rainbow", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page);
    await page.locator("#daynight-btn").click();

    const point = await getCanvasPoint(page, 0.55, 0.45);
    const before = await getTestState(page);

    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(80);
    await page.mouse.click(point.x, point.y);

    await page.waitForFunction(
      (kind) => window.__fireworksTest.lastBurstKind() === kind,
      "mega",
      { timeout: 3000 }
    );
    await page.waitForFunction(
      (count) => window.__fireworksTest.arcCount() > count,
      before.arcCount,
      { timeout: 3000 }
    );

    const cascadeBefore = await page.evaluate(() => window.__fireworksTest.lastCascadeAt());
    await page.waitForFunction(
      (prev) => window.__fireworksTest.lastCascadeAt() > prev,
      cascadeBefore,
      { timeout: 3000 }
    );
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
