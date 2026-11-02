import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    // Match the supplied Codex Windows reference screenshot dimensions.
    viewport: { width: 1352, height: 760 },
    baseURL: "http://127.0.0.1:5173",
    headless: true,
  },
  webServer: {
    command: "npm run demo:dev",
    // Only the automated browser suite opts into synthetic transcript fixtures.
    // A normal Vite dev start opens the same blank new-chat home as Electron.
    env: { VITE_AGENT_WEB_DEMO_FIXTURES: "1" },
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  outputDir: "./test-results",
});
