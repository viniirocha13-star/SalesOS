import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.APP_PORT || 43147);
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: origin,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `${origin}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
