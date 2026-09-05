import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/prepare-e2e.mjs && pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MAILTRACE_WEBHOOK_SECRET: "playwright-local-secret",
      MAILTRACE_DATABASE_PATH: "./.tmp/e2e.sqlite",
      MAILTRACE_ENABLE_DEMO_ENDPOINTS: "true",
    },
  },
});
