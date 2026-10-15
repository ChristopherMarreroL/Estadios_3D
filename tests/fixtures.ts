import { test as base } from "@playwright/test";

export const test = base.extend({
  context: async ({ playwright, browserName }, provide) => {
    // Software WebGL shares a GPU process across browser contexts. Start a
    // browser per test so queued rendering and driver state cannot stall the
    // next test. Playwright applies configured launch/context options and
    // records traces for contexts created through its instrumented APIs.
    const browser = await playwright[browserName].launch();
    try {
      const context = await browser.newContext();
      await provide(context);
    } finally {
      await browser.close();
    }
  },
});
