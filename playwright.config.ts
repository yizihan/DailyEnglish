import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173/DailyEnglish/",
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-test.mjs",
    url: "http://127.0.0.1:4173/DailyEnglish/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
