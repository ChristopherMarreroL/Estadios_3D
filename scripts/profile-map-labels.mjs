import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

// Diagnostic only: compare browser work with visible/hidden text, while the
// application's projection and sizing JavaScript continues unchanged.
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const cdp = await page.context().newCDPSession(page);
const results = [];
try {
  for (const labels of (
    process.env.PROFILE_LABELS || "visible,hidden,promoted"
  ).split(",")) {
    await page.goto("http://localhost:3001");
    await page.locator("[data-map-category]:visible").first().waitFor();
    await page.waitForTimeout(2200);
    if (labels === "hidden")
      await page.addStyleTag({
        content: ".sector-tag, .map-zone-tag { display:none !important }",
      });
    if (labels === "promoted")
      await page.addStyleTag({
        content:
          ".sector-tag, .map-zone-tag { will-change:transform,translate,rotate,scale; transform:translateZ(0) }",
      });
    const canvas = await page
      .locator(".ticket-stadium-canvas canvas")
      .boundingBox();
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start");
    await cdp.send("Tracing.start", {
      categories:
        "devtools.timeline,v8.execute,disabled-by-default-devtools.timeline",
      transferMode: "ReturnAsStream",
    });
    const start = performance.now();
    await page.mouse.move(
      canvas.x + canvas.width * 0.5,
      canvas.y + canvas.height * 0.4,
    );
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) {
      await page.mouse.move(
        canvas.x + canvas.width * (0.5 + (0.25 * i) / 40),
        canvas.y + canvas.height * 0.4,
      );
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    const durationMs = performance.now() - start;
    const { profile } = await cdp.send("Profiler.stop");
    const complete = new Promise((resolve) =>
      cdp.once("Tracing.tracingComplete", resolve),
    );
    await cdp.send("Tracing.end");
    const { stream } = await complete;
    let traceText = "";
    while (true) {
      const chunk = await cdp.send("IO.read", { handle: stream });
      traceText += chunk.data;
      if (chunk.eof) break;
    }
    await cdp.send("IO.close", { handle: stream });
    const trace = JSON.parse(traceText);
    const totals = {};
    for (const event of trace.traceEvents) {
      if (event.ph !== "X" || !event.dur) continue;
      const group = (totals[event.name] ||= { count: 0, inclusiveMs: 0 });
      group.count++;
      group.inclusiveMs += event.dur / 1000;
    }
    results.push({
      labels,
      durationMs,
      timeline: Object.entries(totals)
        .map(([name, values]) => ({ name, ...values }))
        .sort((a, b) => b.inclusiveMs - a.inclusiveMs)
        .slice(0, 30),
      jsSelfSamples: profile.nodes
        .map((node) => ({
          functionName: node.callFrame.functionName,
          url: node.callFrame.url,
          line: node.callFrame.lineNumber + 1,
          hitCount: node.hitCount || 0,
        }))
        .sort((a, b) => b.hitCount - a.hitCount)
        .slice(0, 20),
    });
    await writeFile(
      `artifacts/performance/labels-${labels}-trace.json`,
      traceText,
    );
  }
  await writeFile(
    `artifacts/performance/labels-profile${process.env.PROFILE_LABELS ? `-${process.env.PROFILE_LABELS.replaceAll(",", "-")}` : ""}.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
