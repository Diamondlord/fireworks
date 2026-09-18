const { test, expect } = require("@playwright/test");
const {
  trackPageErrors,
  getTestState,
  getCanvasPoint,
  clickCanvas,
  gotoGame,
  enterPlay,
  enterCompose,
} = require("./helpers");

test.describe("compose and play", () => {
  test("compose canvas click does not spawn fireworks", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    const state = await getTestState(page);
    expect(state.isPlaying).toBe(false);

    const before = await getTestState(page);
    await clickCanvas(page, 0.5, 0.45);
    await page.waitForTimeout(400);
    const after = await getTestState(page);
    expect(after.particleCount).toBe(before.particleCount);
    expect(after.stickerCount).toBe(0);
    expect(after.pointerActive).toBe(false);

    errors.assertNoErrors();
  });

  test("tray tap then canvas tap places a sticker", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="star"]').click();
    await page.waitForFunction(() => window.__fireworksTest.selectedStamp() === "star");

    await clickCanvas(page, 0.4, 0.4);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);

    const state = await getTestState(page);
    expect(state.stickerKinds).toEqual(["star"]);
    expect(state.pointerActive).toBe(false);

    errors.assertNoErrors();
  });

  test("tray drag onto canvas places a sticker", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    const stamp = page.locator('.stamp-btn[data-stamp="butterfly"]');
    const stampBox = await stamp.boundingBox();
    const drop = await getCanvasPoint(page, 0.45, 0.38);
    expect(stampBox).not.toBeNull();

    await page.mouse.move(stampBox.x + stampBox.width / 2, stampBox.y + stampBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(drop.x, drop.y, { steps: 12 });
    await page.mouse.up();

    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);
    const state = await getTestState(page);
    expect(state.stickerKinds).toEqual(["butterfly"]);

    errors.assertNoErrors();
  });

  test("placed sticker can be moved", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="flower"]').click();
    await clickCanvas(page, 0.35, 0.4);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);

    const before = await page.evaluate(() => window.__fireworksTest.stickers()[0]);
    const start = await getCanvasPoint(page, 0.35, 0.4);
    const end = await getCanvasPoint(page, 0.6, 0.42);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForFunction(() => !window.__fireworksTest.pointerActive());

    const after = await page.evaluate(() => window.__fireworksTest.stickers()[0]);
    expect(after.x).toBeGreaterThan(before.x + 20);
    expect(after.kind).toBe("flower");

    errors.assertNoErrors();
  });

  test("eraser removes only the clicked sticker", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="star"]').click();
    await clickCanvas(page, 0.35, 0.38);
    await page.locator('.stamp-btn[data-stamp="moon"]').click();
    await clickCanvas(page, 0.62, 0.4);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 2);

    await page.locator("#trash-btn").click();
    await page.waitForFunction(() => window.__fireworksTest.selectedStamp() === "erase");
    await clickCanvas(page, 0.35, 0.38);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);

    const state = await getTestState(page);
    expect(state.stickerKinds).toEqual(["moon"]);

    errors.assertNoErrors();
  });

  test("flowers balloons and butterflies get mixed colors", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="flower"]').click();
    for (const x of [0.28, 0.38, 0.48, 0.58, 0.68]) {
      await clickCanvas(page, x, 0.36);
    }
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 5);

    const hues = await page.evaluate(() => window.__fireworksTest.stickers().map((s) => s.hue));
    expect(new Set(hues).size).toBeGreaterThan(1);

    errors.assertNoErrors();
  });

  test("new stamps can be placed", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="heart"]').click();
    await clickCanvas(page, 0.4, 0.36);
    await page.locator('.stamp-btn[data-stamp="rocket"]').click();
    await clickCanvas(page, 0.58, 0.4);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 2);

    const state = await getTestState(page);
    expect(state.stickerKinds).toEqual(["heart", "rocket"]);

    errors.assertNoErrors();
  });

  test("play keeps stickers and restores fireworks", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="unicorn"]').click();
    await clickCanvas(page, 0.3, 0.35);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);

    await enterPlay(page);
    await expect(page.locator("#play-btn")).toHaveClass(/active/);

    let state = await getTestState(page);
    expect(state.isPlaying).toBe(true);
    expect(state.stickerCount).toBe(1);

    const before = await getTestState(page);
    await clickCanvas(page, 0.62, 0.48);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });

  test("pause stops bursts and keeps stickers", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="star"]').click();
    await clickCanvas(page, 0.42, 0.36);
    await enterPlay(page);
    await enterCompose(page);

    let state = await getTestState(page);
    expect(state.isPlaying).toBe(false);
    expect(state.stickerCount).toBe(1);

    const before = await getTestState(page);
    await clickCanvas(page, 0.7, 0.45);
    await page.waitForTimeout(400);
    state = await getTestState(page);
    expect(state.stickerCount).toBe(1);
    expect(state.particleCount).toBeLessThanOrEqual(before.particleCount);
    expect(state.pointerActive).toBe(false);

    errors.assertNoErrors();
  });

  test("play tap on a sticker fires a themed effect", async ({ page }) => {
    const errors = trackPageErrors(page);
    await gotoGame(page, { compose: true });

    await page.locator('.stamp-btn[data-stamp="star"]').click();
    await clickCanvas(page, 0.48, 0.4);
    await page.waitForFunction(() => window.__fireworksTest.stickerCount() === 1);
    await enterPlay(page);

    const before = await getTestState(page);
    await clickCanvas(page, 0.48, 0.4);
    await page.waitForFunction(
      (count) => window.__fireworksTest.particleCount() > count,
      before.particleCount,
      { timeout: 3000 }
    );

    errors.assertNoErrors();
  });
});
