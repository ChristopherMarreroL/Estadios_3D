import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

async function waitForCamera(page: Page) {
  await expect(async () => {
    const root = page.locator(".ticket-stadium-canvas [data-camera-request]");
    const request = await root.getAttribute("data-camera-request");
    await expect(root.locator("canvas")).toHaveAttribute(
      "data-camera-state",
      "settled",
    );
    await expect(root.locator("canvas")).toHaveAttribute(
      "data-camera-settled",
      request!,
    );
  }).toPass({ timeout: 20_000 });
}

test("mobile map has compact copy, tap zoom and one-finger move controls", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await waitForCamera(page);
  await expect(
    page.locator(".ticket-legend, .ticket-categories, .ticket-map-footnote"),
  ).toHaveCount(0);
  await page
    .getByText("Buscar un sector o elegir sin usar el 3D", { exact: true })
    .click();
  await page
    .locator(".ticket-sector-list button")
    .filter({ has: page.locator("b", { hasText: /^A6$/ }) })
    .tap();
  await waitForCamera(page);
  const canvas = page.locator(".ticket-stadium-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const span = () =>
    page.locator(".row-tag").evaluateAll((rows) => {
      const first = rows[0].getBoundingClientRect();
      const last = rows[rows.length - 1].getBoundingClientRect();
      return Math.hypot(first.x - last.x, first.y - last.y);
    });
  const initial = await span();
  await page.getByRole("button", { name: "Acercar mapa", exact: true }).tap();
  await expect.poll(span).toBeGreaterThan(initial * 1.1);
  await page.getByRole("button", { name: "Alejar mapa", exact: true }).tap();
  await expect
    .poll(async () => Math.abs((await span()) - initial))
    .toBeLessThan(3);

  const move = page.getByRole("button", {
    name: "Mover el mapa con un dedo",
    exact: true,
  });
  await move.tap();
  await expect(move).toHaveAttribute("aria-pressed", "true");
  const before = await page.locator(".row-tag").first().boundingBox();
  const box = (await canvas.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const point = {
    x: box.x + box.width * 0.4,
    y: box.y + box.height * 0.25,
    id: 1,
  };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  for (const offset of [15, 30, 45])
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...point, x: point.x + offset }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const after = await page.locator(".row-tag").first().boundingBox();
      return Math.hypot(after!.x - before!.x, after!.y - before!.y);
    })
    .toBeGreaterThan(10);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await move.tap();
  await expect(move).toHaveAttribute("aria-pressed", "false");
  const beforeRotate = await page.locator(".row-tag").first().boundingBox();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  for (const offset of [10, 20, 30])
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...point, x: point.x + offset }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => {
      const after = await page.locator(".row-tag").first().boundingBox();
      return Math.hypot(after!.x - beforeRotate!.x, after!.y - beforeRotate!.y);
    })
    .toBeGreaterThan(5);
  const beforePinch = await span();
  const second = { ...point, x: point.x + 100, id: 2 };
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point, second],
  });
  for (const offset of [10, 20])
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { ...point, x: point.x - offset },
        { ...second, x: second.x + offset },
      ],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(span).toBeGreaterThan(beforePinch * 1.1);
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await session.detach();
});
