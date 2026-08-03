import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true";
const readinessURL = new URL("/api/v1/session/bootstrap", baseURL).toString();

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [["list"], ["html", { open: "never" }]],
  testDir: "tests/e2e",
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "pnpm run dev:all:local",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          // This proxied endpoint is available only after both Vite and the API
          // are ready, preventing the first test from racing API startup.
          url: readinessURL,
        },
      }),
  workers: 1,
});
