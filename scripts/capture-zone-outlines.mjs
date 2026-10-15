import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const directory = "artifacts/performance/zone-outlines";
const url = process.env.BENCHMARK_URL || "http://localhost:3001";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CI ? undefined : "msedge",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(url);
  await page.locator("[data-zone-key]:visible").first().waitFor();
  const zones = await page
    .locator("[data-zone-key]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.dataset.zoneKey,
        title: element.getAttribute("aria-label"),
      })),
    );
  const captures = [];
  for (const zone of zones) {
    await page.goto(url);
    await page.locator(`[data-zone-key="${zone.key}"]`).click();
    await page.waitForTimeout(1700);
    const path = `${directory}/${zone.key.replace(":", "_")}.png`;
    await page.locator(".ticket-stadium-canvas").screenshot({ path });
    captures.push({ ...zone, path });
    console.log(zone.key, zone.title);
  }
  const cards = await Promise.all(
    captures.map(async (capture) => {
      const data = (await readFile(capture.path)).toString("base64");
      return `<figure><figcaption>${capture.title}</figcaption><img src="data:image/png;base64,${data}"></figure>`;
    }),
  );
  await page.setViewportSize({ width: 1536, height: 1900 });
  await page.setContent(
    `<style>body{margin:0;background:#fff;font:16px Arial}main{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0}figcaption{padding:8px}img{width:100%;display:block}</style><main>${cards.join("")}</main>`,
  );
  await page
    .locator("img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => image.decode())),
    );
  await page.screenshot({ path: `${directory}/all-zones.png`, fullPage: true });
  await writeFile(
    `${directory}/captures.json`,
    JSON.stringify(captures, null, 2) + "\n",
  );
} finally {
  await browser.close();
}
