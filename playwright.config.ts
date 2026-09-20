import { defineConfig } from "@playwright/test";

const externalURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30000,
  workers: 2,
  use: {
    baseURL: externalURL || "http://127.0.0.1:4173",
    viewport: { width: 1440, height: 1050 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalURL
    ? undefined
    : {
        command: "node scripts/serve.mjs --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
      },
});
