import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  workers: 1,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3001",
    channel: process.env.CI ? undefined : "msedge",
    viewport: { width: 1440, height: 1000 },
    // Continuous screencast readbacks compete with WebGL on software GPUs.
    // Keep actions, DOM snapshots and sources for diagnosing failed tests.
    trace: {
      mode: "retain-on-failure",
      screenshots: false,
      snapshots: true,
      sources: true,
    },
    launchOptions: process.env.CI
      ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }
      : {},
  },
  webServer: {
    command: "npm run start -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
