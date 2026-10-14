import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Run against a production server. Headless GPU timings are comparative only.
const url = process.env.BENCHMARK_URL || "http://localhost:3001";
const label = process.env.BENCHMARK_LABEL || "current";
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : "msedge",
  headless: true,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
await context.addInitScript(() => {
  window.mapBenchmark = { renders: [], draws: 0, longTasks: [] };
  for (const event of ["pointermove", "wheel"]) {
    document.addEventListener(
      event,
      () => {
        window.mapBenchmark.lastInput = performance.now();
      },
      { capture: true, passive: true },
    );
  }
  for (const proto of [
    WebGLRenderingContext.prototype,
    WebGL2RenderingContext.prototype,
  ]) {
    const clear = proto.clear;
    proto.clear = function (...args) {
      window.mapBenchmark.renders.push({
        time: performance.now(),
        draws: window.mapBenchmark.draws,
        width: this.canvas.width,
        height: this.canvas.height,
        inputTime: window.mapBenchmark.lastInput,
      });
      window.mapBenchmark.draws = 0;
      return clear.apply(this, args);
    };
    for (const method of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      if (!proto[method]) continue;
      const draw = proto[method];
      proto[method] = function (...args) {
        window.mapBenchmark.draws++;
        return draw.apply(this, args);
      };
    }
  }
  new PerformanceObserver((list) => {
    window.mapBenchmark.longTasks.push(
      ...list.getEntries().map((e) => e.duration),
    );
  }).observe({ type: "longtask", buffered: true });
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
const mbps = Number(process.env.BENCHMARK_MBPS || 10);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 40,
  downloadThroughput: mbps * 125000,
  uploadThroughput: mbps * 125000,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const samples = [];
async function measureMovement(action) {
  const start = await page.evaluate(() => ({
    frame: window.mapBenchmark.renders.length,
    time: performance.now(),
    task: window.mapBenchmark.longTasks.length,
    canvas: (() => {
      const c = document.querySelector(".ticket-stadium-canvas canvas");
      return { width: c.width, height: c.height };
    })(),
  }));
  await action();
  return page.evaluate((start) => {
    const frames = window.mapBenchmark.renders.slice(start.frame);
    const gaps = frames
      .slice(1)
      .map((f, i) => f.time - frames[i].time)
      .sort((a, b) => a - b);
    const seenInputs = new Set();
    const inputLatencies = frames
      .filter((frame) => {
        if (!(frame.inputTime >= start.time) || seenInputs.has(frame.inputTime))
          return false;
        seenInputs.add(frame.inputTime);
        return true;
      })
      .map((frame) => frame.time - frame.inputTime)
      .sort((a, b) => a - b);
    return {
      frames: frames.length,
      medianMs: gaps[Math.floor(gaps.length / 2)] ?? null,
      p95Ms: gaps[Math.floor(gaps.length * 0.95)] ?? null,
      maxDrawCalls: frames.length ? Math.max(...frames.map((f) => f.draws)) : 0,
      inputToDrawMedianMs:
        inputLatencies[Math.floor(inputLatencies.length / 2)] ?? null,
      inputToDrawP95Ms:
        inputLatencies[Math.floor(inputLatencies.length * 0.95)] ?? null,
      canvasResolutions: [
        ...new Set([
          `${start.canvas.width}x${start.canvas.height}`,
          ...frames.map((f) => `${f.width}x${f.height}`),
        ]),
      ],
      longTasks: window.mapBenchmark.longTasks.slice(start.task),
    };
  }, start);
}
async function canvasPoint(bounds) {
  return page.evaluate((bounds) => {
    const canvas = document.querySelector(".ticket-stadium-canvas canvas");
    // Tags are deliberately interactive. Start the camera gesture on canvas,
    // instead of accidentally measuring a click on one of those tags.
    for (const dy of [0, 0.03, -0.03, 0.06, -0.06, 0.12, -0.12]) {
      for (const dx of [0, 0.03, -0.03, 0.06, -0.06, 0.12, -0.12]) {
        const x = bounds.x + bounds.width * (0.5 + dx);
        const y = bounds.y + bounds.height * (0.65 + dy);
        if (document.elementFromPoint(x, y) === canvas) return { x, y };
      }
    }
    throw new Error("No canvas point found for camera gesture");
  }, bounds);
}
async function dragCanvas(bounds, button = "left") {
  const point = await canvasPoint(bounds);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button });
  for (let i = 1; i <= 40; i++) {
    await page.mouse.move(
      point.x + (bounds.width * (0.25 * i)) / 40,
      point.y - bounds.height * (button === "right" ? (0.08 * i) / 40 : 0),
    );
    await page.waitForTimeout(16);
  }
  await page.mouse.up({ button });
}
await mkdir("artifacts/performance", { recursive: true });
try {
  for (const cache of ["cold", "warm"]) {
    await page.goto(url);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("[data-map-category]")].some(
          (element) => getComputedStyle(element).visibility === "visible",
        ) && !document.querySelector(".scene-loading"),
    );
    const readyMs = await page.evaluate(() => performance.now());
    await page.waitForTimeout(1600);
    if (cache === "cold")
      await page.screenshot({ path: `artifacts/performance/map-${label}.png` });
    const load = await page.evaluate(() => ({
      models: performance
        .getEntriesByType("resource")
        .filter((e) => e.name.includes(".glb"))
        .map((e) => ({
          name: new URL(e.name).pathname,
          durationMs: e.duration,
          transferBytes: e.transferSize,
          decodedBytes: e.decodedBodySize,
        })),
      longTasks: window.mapBenchmark.longTasks,
    }));
    const start = await page.evaluate(() => window.mapBenchmark.renders.length);
    await page.waitForTimeout(1000);
    const idleFrames = await page.evaluate(
      (n) => window.mapBenchmark.renders.length - n,
      start,
    );
    const canvas = page.locator(".ticket-stadium-canvas canvas");
    const bounds = await canvas.boundingBox();
    // Measure the new intermediate group view after its camera flight settles.
    await page.locator('[data-zone-key="2278:-1"]').click();
    await page.waitForTimeout(1700);
    const zoneOrbit = await measureMovement(() => dragCanvas(bounds));
    await page.waitForTimeout(2000);
    const zoneIdleStart = await page.evaluate(
      () => window.mapBenchmark.renders.length,
    );
    await page.waitForTimeout(1000);
    const zoneIdleFrames = await page.evaluate(
      (n) => window.mapBenchmark.renders.length - n,
      zoneIdleStart,
    );
    await page
      .getByRole("button", { name: "Todo el estadio", exact: true })
      .click();
    await page.waitForTimeout(1700);
    const drag = await measureMovement(() => dragCanvas(bounds));
    await page.waitForTimeout(2000);
    // Exercise the close-up path reported by the user, rather than drawing
    // conclusions about all navigation from the overview orbit alone.
    await page
      .getByText("Buscar un sector o elegir sin usar el 3D", { exact: true })
      .click();
    await page
      .locator(".ticket-sector-list button")
      .filter({ has: page.locator("b", { hasText: /^A39$/ }) })
      .click();
    await page.waitForTimeout(1700);
    await canvas.scrollIntoViewIfNeeded();
    const sectorBounds = await canvas.boundingBox();
    const zoomPoint = await canvasPoint(sectorBounds);
    await page.mouse.move(zoomPoint.x, zoomPoint.y);
    const zoom = await measureMovement(async () => {
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -28);
        await page.waitForTimeout(40);
      }
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 28);
        await page.waitForTimeout(40);
      }
    });
    await page.waitForTimeout(2000);
    const pan = await measureMovement(() => dragCanvas(sectorBounds, "right"));
    await page.waitForTimeout(2000);
    const sectorOrbit = await measureMovement(() => dragCanvas(sectorBounds));
    samples.push({
      cache,
      readyMs,
      ...load,
      idleFrames,
      zoneOrbit,
      zoneIdleFrames,
      drag,
      zoom,
      pan,
      sectorOrbit,
    });
  }
  const result = {
    url,
    label,
    environment: `Headless Edge, 1440x1000; local production; ${mbps} Mbps / 40 ms latency`,
    samples,
    errors,
  };
  await mkdir("artifacts/performance", { recursive: true });
  await writeFile(
    `artifacts/performance/map-${label}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
