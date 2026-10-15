import { expect, test, type Page } from "@playwright/test";
import catalog from "../src/data/seat-catalog.json";
declare global {
  interface Window {
    mapFrames: number;
    slowFlightFrames: number;
    cameraFlightOutlines: (string | null)[];
  }
}

async function waitForMapCamera(page: Page) {
  await expect(page.locator(".ticket-stadium-canvas canvas")).toBeVisible();
  await expect
    .poll(
      () =>
        page.locator(".ticket-stadium-canvas").evaluate((root) => {
          const requested = root
            .querySelector("[data-camera-request]")
            ?.getAttribute("data-camera-request");
          const canvas = root.querySelector("canvas");
          return Boolean(
            requested &&
            canvas?.getAttribute("data-camera-state") === "settled" &&
            canvas.getAttribute("data-camera-settled") === requested,
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);
}

async function openSectorFromCatalog(page: Page, name: string) {
  await waitForMapCamera(page);
  const catalog = page.locator(".ticket-accessible");
  if ((await catalog.getAttribute("open")) === null)
    await catalog.locator("summary").click();
  await page
    .locator(".ticket-sector-list button")
    .filter({ has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) })
    .click();
  await expect(page.locator(".ticket-map-bar h2")).toContainText(` · ${name}`);
  await waitForMapCamera(page);
}

test("slow rendering does not stretch camera flights over 33 frames", async ({
  page,
}) => {
  await page.goto("/");
  await waitForMapCamera(page);
  await page.evaluate(() => {
    // Simulate a slow renderer without changing the camera's intended duration.
    window.slowFlightFrames = 0;
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => {
        if (
          document
            .querySelector("canvas")
            ?.getAttribute("data-camera-state") === "moving"
        )
          window.slowFlightFrames++;
        callback(performance.now());
      }, 200);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page
    .getByRole("button", { name: "Explorar Corporativo", exact: true })
    .click();
  await waitForMapCamera(page);
  // At <=5 FPS the old delta cap required at least 33 frames. Real elapsed
  // time finishes within a handful, even if one software-rendered frame is slow.
  const frames = await page.evaluate(() => window.slowFlightFrames);
  expect(frames).toBeGreaterThan(0);
  expect(frames).toBeLessThan(15);
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "2275:0",
  );
});

test("light map loads alone, stays idle, and retains its canvas across seat preview", async ({
  page,
}) => {
  // This integration test loads both GLBs and captures their rendered output.
  test.setTimeout(120_000);
  const errors: string[] = [];
  // Vercel injects this endpoint only on hosted deployments.
  await page.route("**/_vercel/speed-insights/script.js", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  const models: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (r) => {
    if (r.url().includes(".glb")) models.push(r.url());
  });
  await page.addInitScript(() => {
    const state = window;
    state.mapFrames = 0;
    for (const proto of [
      WebGLRenderingContext.prototype,
      WebGL2RenderingContext.prototype,
    ]) {
      const clear = proto.clear;
      proto.clear = function (...args) {
        state.mapFrames++;
        return clear.apply(this, args);
      };
    }
  });
  let releaseMap!: () => void;
  const mapGate = new Promise<void>((resolve) => {
    releaseMap = resolve;
  });
  await page.route("**/models/estadio-map-*.glb", async (route) => {
    await mapGate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const loading = page.locator(".scene-loading-map").first();
  await expect(loading).toBeVisible();
  // The dynamic-module placeholder is replaced by the scene's placeholder.
  // Retry across that handoff rather than inspect a just-detached element.
  await expect(async () => {
    await expect(loading).toBeVisible();
    await expect(loading).toContainText("Preparando el estadio 3D");
    await expect(loading.locator("img")).toHaveCount(0);
    const loadingAppearance = await loading.evaluate((element) => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, color: style.backgroundColor };
    });
    expect(loadingAppearance.image).toBe("none");
    const channels = loadingAppearance.color
      .match(/\d+/g)!
      .slice(0, 3)
      .map(Number);
    expect(Math.min(...channels)).toBeGreaterThan(200);
    expect(Math.max(...channels) - Math.min(...channels)).toBeLessThan(30);
  }).toPass({ timeout: 10_000 });
  await page.locator(".ticket-stadium-canvas").screenshot({
    path: "artifacts/performance/map-loading-gray.png",
  });
  releaseMap();
  await waitForMapCamera(page);
  await expect(
    page.locator("[data-map-category]:visible").first(),
  ).toBeVisible();
  await expect(page.locator(".scene-loading")).toHaveCount(0);
  expect(models).toHaveLength(1);
  expect(models[0]).toContain("estadio-map-");
  const response = await page.request.get(models[0]);
  expect(response.headers()["cache-control"]).toContain("immutable");
  const frames = await page.evaluate(() => window.mapFrames);
  await page.waitForTimeout(1000);
  expect((await page.evaluate(() => window.mapFrames)) - frames).toBeLessThan(
    3,
  );
  const mapBounds = (await page
    .locator(".ticket-stadium-canvas canvas")
    .boundingBox())!;
  await page.mouse.move(
    mapBounds.x + mapBounds.width * 0.5,
    mapBounds.y + mapBounds.height * 0.65,
  );
  await page.mouse.down();
  await page.mouse.move(
    mapBounds.x + mapBounds.width * 0.7,
    mapBounds.y + mapBounds.height * 0.65,
    { steps: 10 },
  );
  await page.mouse.up();
  await waitForMapCamera(page);
  const afterDrag = await page.evaluate(() => window.mapFrames);
  await page.waitForTimeout(1000);
  expect(
    (await page.evaluate(() => window.mapFrames)) - afterDrag,
  ).toBeLessThan(3);
  await page
    .getByText("Buscar un sector o elegir sin usar el 3D", { exact: true })
    .click();
  await page
    .locator(".ticket-sector-list button")
    .filter({ has: page.locator("b", { hasText: /^A6$/ }) })
    .click();
  await waitForMapCamera(page);
  await page.locator(".ticket-row-list button:not([disabled])").first().click();
  await page
    .locator("dialog[open]")
    .getByRole("button", { name: /Añadir/ })
    .click();
  const canvas = await page
    .locator(".ticket-stadium-canvas canvas")
    .elementHandle();
  await page
    .getByRole("button", { name: /Ver desde/ })
    .first()
    .click();
  await expect(page.locator(".seat-preview-canvas canvas")).toBeVisible();
  await expect
    .poll(() => models.some((url) => url.includes("estadio-detail-")))
    .toBe(true);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: "artifacts/performance/seat-preview-after.png",
  });
  await page.getByRole("button", { name: "Cerrar vista 3D" }).click();
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  expect(models.filter((url) => url.includes("estadio-map-"))).toHaveLength(1);
  await page.getByRole("button", { name: "Ver cubierta", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ocultar cubierta", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test.describe("map clarity", () => {
  test.use({ deviceScaleFactor: 2 });

  test("rotation and zoom retain the full drawing resolution", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForMapCamera(page);
    const canvas = page.locator(".ticket-stadium-canvas canvas");
    await expect(
      page.locator("[data-map-category]:visible").first(),
    ).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    const initial = await canvas.evaluate((element: HTMLCanvasElement) => ({
      width: element.width,
      height: element.height,
      cssWidth: element.getBoundingClientRect().width,
      cssHeight: element.getBoundingClientRect().height,
    }));
    // A high-density screen must stay sharp throughout interaction, including
    // the frames between pointer events, rather than recover only afterward.
    expect(initial.width / initial.cssWidth).toBeCloseTo(2, 1);
    expect(initial.height / initial.cssHeight).toBeCloseTo(2, 1);
    await canvas.evaluate((element: HTMLCanvasElement) => {
      const samples: number[][] = [];
      const sample = () => {
        samples.push([element.width, element.height]);
        if (samples.length < 240) requestAnimationFrame(sample);
      };
      (
        element as HTMLCanvasElement & { resolutionSamples: number[][] }
      ).resolutionSamples = samples;
      requestAnimationFrame(sample);
    });
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.45, {
      steps: 30,
    });
    await page.mouse.up();
    for (const delta of [-250, -250, 250]) {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const samples = await canvas.evaluate(
      (element) =>
        (element as HTMLCanvasElement & { resolutionSamples: number[][] })
          .resolutionSamples,
    );
    expect(samples.length).toBeGreaterThan(10);
    expect(
      samples.every(
        ([width, height]) =>
          width === initial.width && height === initial.height,
      ),
    ).toBe(true);
  });
});

test("overview shows readable categories while every sector remains interactive", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await waitForMapCamera(page);
  const categories = page.locator("[data-map-category]:visible");
  await expect(categories.first()).toBeVisible();
  expect(await categories.count()).toBeGreaterThan(8);
  expect(await categories.count()).toBeLessThanOrEqual(18);
  await expect(page.locator(".sector-tag:visible")).toHaveCount(0);
  await expect(categories.first().locator("..").locator("svg")).toHaveCount(0);
  const boxes = [];
  for (const category of await categories.all()) {
    await expect(category).toBeInViewport();
    const size = await category.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    );
    expect(size).toBeGreaterThanOrEqual(10);
    boxes.push({
      name: await category.innerText(),
      bounds: (await category.boundingBox())!,
    });
  }
  for (let first = 0; first < boxes.length; first++) {
    for (let second = first + 1; second < boxes.length; second++) {
      const a = boxes[first],
        b = boxes[second];
      const width =
        Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) -
        Math.max(a.bounds.x, b.bounds.x);
      const height =
        Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) -
        Math.max(a.bounds.y, b.bounds.y);
      expect(
        width > 1 && height > 1,
        `${a.name} and ${b.name} should not obscure each other`,
      ).toBe(false);
    }
  }
  // Hidden names retain their projected anchors. Probe the geometry at each
  // anchor, so reducing labels cannot silently remove sectors from hit testing.
  await page.addStyleTag({
    content: ".map-zone-tag { pointer-events: none !important; }",
  });
  const anchors = await page.locator(".sector-tag").evaluateAll((elements) =>
    elements.map((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        name: element.getAttribute("aria-label")!.split(",")[0],
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
    }),
  );
  expect(anchors.length).toBeGreaterThan(100);
  for (const anchor of anchors) {
    await page.mouse.move(anchor.x, anchor.y);
    const caption = await page.locator(".ticket-scene-caption").innerText();
    expect(
      caption.startsWith(`${anchor.name} · `),
      `Pointer must reach ${anchor.name}, received: ${caption}`,
    ).toBe(true);
  }
  const target = anchors.find((anchor) => anchor.name === "A35")!;
  await page.mouse.click(target.x, target.y);
  await expect(page.locator(".ticket-map-bar h2")).toHaveText("Palco A · A35");
  await waitForMapCamera(page);
  await expect(page.locator("[data-map-category]:visible")).toHaveCount(0);
  await expect(page.locator('.sector-tag[aria-label^="A35,"]')).toHaveCount(1);
  await expect(page.locator('.sector-tag[aria-label^="A35,"]')).toBeHidden();
  const fontSizes = await page
    .locator(".sector-tag:visible")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return parseFloat(style.fontSize) * (parseFloat(style.scale) || 1);
      }),
    );
  expect(fontSizes.length).toBeGreaterThan(0);
  for (const size of fontSizes) expect(size).toBeGreaterThanOrEqual(7.9);
  await page.getByRole("button", { name: "Todo el estadio" }).click();
  await openSectorFromCatalog(page, "AAA3");
  const source = catalog.groups
    .find((group) => group.id === 2289)!
    .sectors.find((sector) => sector.name === "PALCO - AAA3")!;
  await expect(page.locator(".ticket-map-bar p")).toContainText(
    `6 disponibles de ${source.seatCount}`,
  );
  await expect(page.locator('.sector-tag[aria-label^="AAA3,"]')).toHaveCount(1);
  await expect(page.locator('.sector-tag[aria-label^="AAA3,"]')).toBeHidden();
  await expect(page.locator(".sector-tag-detail:visible")).toHaveCount(0);
  await expect(page.locator(".ticket-row > b")).toHaveText(
    source.rows.map((row) => `Fila ${row.label}`),
  );
});

test("panning keeps other sector labels available for navigation", async ({
  page,
}) => {
  await page.goto("/");
  await waitForMapCamera(page);
  await openSectorFromCatalog(page, "A35");
  const canvas = page.locator(".ticket-stadium-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.45, {
    steps: 15,
  });
  await page.mouse.up({ button: "right" });
  // Wheel events advance OrbitControls in discrete increments. Pull back far
  // enough to bring A31 into view after panning away from the original sector.
  for (let step = 0; step < 24; step++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(100);
  }
  const target = page.locator(".sector-tag").filter({ hasText: /^A31$/ });
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText("Palco A · A31");
  await waitForMapCamera(page);
  await page.locator(".sector-tag").filter({ hasText: /^A30$/ }).click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText("Palco A · A30");
});

test("a visible chair outside the open sector navigates and asks before adding", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await waitForMapCamera(page);
  await openSectorFromCatalog(page, "A35");
  const canvas = page.locator(".ticket-stadium-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
  for (let step = 0; step < 3; step++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(500);
  let picked: RegExpMatchArray | null = null;
  for (let y = 0.22; y <= 0.78 && !picked; y += 0.025) {
    for (let x = 0.12; x <= 0.88 && !picked; x += 0.025) {
      const position = { x: box.x + box.width * x, y: box.y + box.height * y };
      await page.mouse.move(position.x, position.y);
      const caption = await page.locator(".ticket-scene-caption").innerText();
      const match = caption.match(
        /^(A\d+) · (Fila .+) · Butaca (.+) · Disponible$/,
      );
      if (!match || match[1] === "A35") continue;
      await page.mouse.click(position.x, position.y);
      picked = match;
    }
  }
  expect(
    picked,
    "A neighboring available chair must respond without opening its sector first",
  ).not.toBeNull();
  const dialog = page.locator("dialog[open]");
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    `Palco A · ${picked![1]}`,
  );
  await waitForMapCamera(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`${picked![2]} · Butaca ${picked![3]}`);
  await expect(dialog).toContainText(`Palco A · ${picked![1]}`);
  await expect(
    page.getByText("0 entradas · precios demo", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Añadir al carrito", exact: true })
    .click();
  await expect(
    page.getByText("1 entrada · precios demo", { exact: true }),
  ).toBeVisible();
});

test("colored sector areas preserve sector picking", async ({ page }) => {
  await page.goto("/");
  await waitForMapCamera(page);
  await expect(
    page.locator("[data-map-category]:visible").first(),
  ).toBeVisible();
  const box = (await page
    .locator(".ticket-stadium-canvas canvas")
    .boundingBox())!;
  let found = false;
  for (let y = 0.3; y <= 0.85 && !found; y += 0.07)
    for (let x = 0.25; x <= 0.8 && !found; x += 0.06) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      const caption = await page.locator(".ticket-scene-caption").innerText();
      const match = caption.match(/^(.+) · \d+ de \d+ disponibles$/);
      if (!match) continue;
      await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
      await expect(page.locator(".ticket-map-bar h2")).toContainText(
        ` · ${match[1]}`,
      );
      found = true;
    }
  expect(found, "A colored sector should open its own seats").toBe(true);
});

test("pointer picks a seat in the open sector and mobile stays usable", async ({
  page,
}) => {
  await page.goto("/");
  await waitForMapCamera(page);
  await page
    .getByText("Buscar un sector o elegir sin usar el 3D", { exact: true })
    .click();
  await page
    .locator(".ticket-sector-list button")
    .filter({ has: page.locator("b", { hasText: /^A6$/ }) })
    .click();
  await waitForMapCamera(page);
  await page.locator(".ticket-stadium-canvas canvas").scrollIntoViewIfNeeded();
  const box = (await page
    .locator(".ticket-stadium-canvas canvas")
    .boundingBox())!;
  let found = false;
  for (let y = 0.3; y <= 0.8 && !found; y += 0.06) {
    for (let x = 0.25; x <= 0.8 && !found; x += 0.04) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      const caption = await page.locator(".ticket-scene-caption").innerText();
      if (/^A6 · Fila .+ · Butaca .+ · Disponible$/.test(caption)) {
        await expect(page.locator(".ticket-stadium-canvas canvas")).toHaveCSS(
          "cursor",
          "pointer",
        );
        await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
        await expect(page.locator("dialog[open]")).toBeVisible();
        found = true;
      }
    }
  }
  expect(found, "Raycast should find an available A6 chair").toBe(true);
  await page.keyboard.press("Escape");
  let sold = false;
  // A sparse grid can repeatedly land in the gaps between the narrow rows.
  // Sample densely enough to hit an actual sold chair before checking its cursor.
  for (let y = 0.2; y <= 0.8 && !sold; y += 0.025)
    for (let x = 0.2; x <= 0.8 && !sold; x += 0.025) {
      await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
      if (
        /^A6 · Fila .+ · Butaca .+ · Agotada$/.test(
          await page.locator(".ticket-scene-caption").innerText(),
        )
      ) {
        await expect(page.locator(".ticket-stadium-canvas canvas")).toHaveCSS(
          "cursor",
          "not-allowed",
        );
        sold = true;
      }
    }
  expect(sold, "Sold seats must show their unavailable cursor").toBe(true);
  await page.mouse.move(box.x + box.width + 5, box.y + box.height / 2);
  await expect(page.locator(".ticket-stadium-canvas canvas")).toHaveCSS(
    "cursor",
    "grab",
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height * 0.8, {
    steps: 3,
  });
  await expect(page.locator(".ticket-stadium-canvas canvas")).toHaveCSS(
    "cursor",
    "grabbing",
  );
  await page.mouse.up({ button: "right" });
  await expect(page.locator(".ticket-stadium-canvas canvas")).toHaveCSS(
    "cursor",
    "grab",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Todo el estadio" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Todo el estadio" }).click();
  await expect(
    page.getByRole("heading", { name: "Explora el estadio en 3D" }),
  ).toBeVisible();
});

test("zone cards distinguish both sides, outline their members, and filter the catalog", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await waitForMapCamera(page);
  await page.evaluate(() => {
    window.cameraFlightOutlines = [];
    const canvas = document.querySelector(".ticket-stadium-canvas canvas")!;
    new MutationObserver(() => {
      if (canvas.getAttribute("data-camera-state") === "moving")
        window.cameraFlightOutlines.push(
          document
            .querySelector("[data-zone-outline]")
            ?.getAttribute("data-zone-outline") ?? null,
        );
    }).observe(canvas, {
      attributes: true,
      attributeFilter: ["data-camera-state"],
    });
  });
  await expect(
    page.locator("[data-map-category]:visible").first(),
  ).toBeVisible();
  const sides = new Map<string, string[]>();
  const cases = [
    { key: "2287:-1", name: "Palco A", side: "izquierdo", group: 2287 },
    { key: "2287:1", name: "Palco A", side: "derecho", group: 2287 },
    { key: "2278:-1", name: "Gradas", side: "izquierdo", group: 2278 },
    { key: "2275:0", name: "Corporativo", side: "", group: 2275 },
    { key: "2281:0", name: "VIP Licey", side: "", group: 2281 },
    { key: "2282:0", name: "Balcón Escogido", side: "", group: 2282 },
    { key: "2288:1", name: "Palco AA", side: "derecho", group: 2288 },
  ];
  for (const [index, item] of cases.entries()) {
    const card = page.locator(`[data-zone-key="${item.key}"]`);
    await expect(card).toHaveAccessibleName(
      `Explorar ${item.name}${item.side ? `, lado ${item.side}` : ""}`,
    );
    await expect(card).toHaveCSS("cursor", "pointer");
    const canvas = page.locator(".ticket-stadium-canvas canvas");
    if (index === 0) {
      await card.focus();
      await page.keyboard.press("Enter");
    } else await card.click();
    const title = `${item.name}${item.side ? ` · Lado ${item.side}` : ""}`;
    await expect(page.locator(".ticket-map-bar h2")).toHaveText(title);
    await expect(page.locator(".ticket-step")).toHaveText("02");
    await waitForMapCamera(page);
    expect(await page.evaluate(() => window.cameraFlightOutlines.at(-1))).toBe(
      "",
    );
    const details = page.locator(".ticket-accessible");
    if ((await details.getAttribute("open")) === null)
      await details.locator("summary").click();
    const names = await page.locator(".ticket-sector-list b").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    await expect(page.locator(".ticket-map-bar p")).toContainText(
      `${names.length} sectores`,
    );
    const expected = catalog.groups
      .find((group) => group.id === item.group)!
      .sectors.filter((sector) => sector.seatCount > 0)
      .map((sector) =>
        sector.name.replace(
          /PALCO\s*-?\s*|PREFERENCIA\s*-\s*|GRADAS\s*-\s*/g,
          "",
        ),
      );
    expect(names.every((name) => expected.includes(name))).toBe(true);
    if (!item.side) expect([...names].sort()).toEqual([...expected].sort());
    if (item.name === "Palco A") sides.set(item.side, names);
    await canvas.scrollIntoViewIfNeeded();
    await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
      "data-zone-outline",
      item.key,
    );
    const bounds = (await canvas.boundingBox())!;
    for (const name of names) {
      const tag = page.locator(`.sector-tag[aria-label^="${name},"]`);
      await expect(tag).toBeVisible();
      const anchor = await tag.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      });
      expect(
        anchor.x,
        `${title}: ${name} horizontally framed`,
      ).toBeGreaterThanOrEqual(bounds.x);
      expect(anchor.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(
        anchor.y,
        `${title}: ${name} vertically framed`,
      ).toBeGreaterThanOrEqual(bounds.y);
      expect(anchor.y).toBeLessThanOrEqual(bounds.y + bounds.height - 44);
    }
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.locator(".ticket-total small")).toHaveText(
      "0 entradas · precios demo",
    );
    await page
      .getByRole("button", { name: "Todo el estadio", exact: true })
      .click();
    await expect(
      page.locator("[data-map-category]:visible").first(),
    ).toBeVisible();
    await waitForMapCamera(page);
  }
  const left = sides.get("izquierdo")!,
    right = sides.get("derecho")!;
  expect(left.some((name) => right.includes(name))).toBe(false);
  const all = catalog.groups
    .find((group) => group.id === 2287)!
    .sectors.filter((sector) => sector.seatCount > 0)
    .map((sector) => sector.name.replace(/PALCO\s*-?\s*/g, ""));
  expect([...left, ...right].sort()).toEqual(all.sort());
});

test("Gradas zone opens D17 or D18, asks before adding, and returns through the zone", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await waitForMapCamera(page);
  // Hold the animation clock so this specifically tests cancellation during
  // the approach, regardless of how long browser input takes on a CI runner.
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  await page
    .getByRole("button", {
      name: "Explorar Gradas, lado izquierdo",
      exact: true,
    })
    .evaluate((button: HTMLButtonElement) => button.click());
  const canvas = page.locator(".ticket-stadium-canvas canvas");
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "",
  );
  const earlyBounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    earlyBounds.x + earlyBounds.width * 0.7,
    earlyBounds.y + earlyBounds.height * 0.55,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    earlyBounds.x + earlyBounds.width * 0.7 + 40,
    earlyBounds.y + earlyBounds.height * 0.55,
    { steps: 8 },
  );
  await page.mouse.up({ button: "right" });
  await page.clock.resume();
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "",
  );
  await page
    .getByRole("button", { name: "Todo el estadio", exact: true })
    .click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    "Explora el estadio en 3D",
  );
  await waitForMapCamera(page);
  await page
    .getByRole("button", {
      name: "Explorar Gradas, lado izquierdo",
      exact: true,
    })
    .click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    "Gradas · Lado izquierdo",
  );
  await waitForMapCamera(page);
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "2278:-1",
  );
  const zoneCanvas = (await canvas.boundingBox())!;
  await page.mouse.move(
    zoneCanvas.x + zoneCanvas.width * 0.85,
    zoneCanvas.y + zoneCanvas.height * 0.8,
  );
  await page.mouse.down({ button: "right" });
  await page.mouse.move(
    zoneCanvas.x + zoneCanvas.width * 0.85 + 35,
    zoneCanvas.y + zoneCanvas.height * 0.8,
    { steps: 12 },
  );
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(400);
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "2278:-1",
  );
  let sector = "";
  for (const name of ["D17", "D18"]) {
    const tag = page.locator(`.sector-tag[aria-label^="${name},"]`);
    const label = (await tag.getAttribute("aria-label"))!;
    if (Number(label.match(/, (\d+) disponibles/)![1]) > 0) {
      sector = name;
      await tag.click();
      break;
    }
  }
  expect(
    sector,
    "At least one of D17/D18 must have available demo seats",
  ).not.toBe("");
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    `Gradas · ${sector}`,
  );
  await expect(page.locator(".ticket-step")).toHaveText("03");
  await expect(page.locator("[data-zone-outline]")).toHaveAttribute(
    "data-zone-outline",
    "",
  );
  await expect(
    page.getByRole("button", { name: "Volver a la zona", exact: true }),
  ).toBeVisible();
  await waitForMapCamera(page);
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  let picked: RegExpMatchArray | null = null;
  for (let y = 0.2; y <= 0.82 && !picked; y += 0.025)
    for (let x = 0.15; x <= 0.85 && !picked; x += 0.025) {
      const position = {
        x: bounds.x + bounds.width * x,
        y: bounds.y + bounds.height * y,
      };
      await page.mouse.move(position.x, position.y);
      const caption = await page.locator(".ticket-scene-caption").innerText();
      const match = caption.match(
        new RegExp(`^${sector} · (Fila .+) · Butaca (.+) · Disponible$`),
      );
      if (!match) continue;
      await expect(canvas).toHaveCSS("cursor", "pointer");
      await page.mouse.click(position.x, position.y);
      picked = match;
    }
  expect(
    picked,
    `An available ${sector} chair should respond to the pointer`,
  ).not.toBeNull();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toContainText(`${picked![1]} · Butaca ${picked![2]}`);
  await expect(page.locator(".ticket-total small")).toHaveText(
    "0 entradas · precios demo",
  );
  await dialog
    .getByRole("button", { name: "Añadir al carrito", exact: true })
    .click();
  await expect(page.locator(".ticket-total small")).toHaveText(
    "1 entrada · precios demo",
  );
  await page.mouse.move(bounds.x - 5, bounds.y + bounds.height / 2);
  await expect(canvas).toHaveCSS("cursor", "grab");
  await page
    .getByRole("button", { name: "Volver a la zona", exact: true })
    .click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    "Gradas · Lado izquierdo",
  );
  await expect(page.locator(".ticket-step")).toHaveText("02");
  await page
    .getByRole("button", { name: "Todo el estadio", exact: true })
    .click();
  await expect(page.locator(".ticket-map-bar h2")).toHaveText(
    "Explora el estadio en 3D",
  );
  await expect(page.locator(".ticket-step")).toHaveText("01");
  await expect(page.locator(".ticket-total small")).toHaveText(
    "1 entrada · precios demo",
  );
});
