import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: "html",
  webServer: CI
    ? {
        command: "yarn build && yarn preview --port 4173",
        url: "http://localhost:4173/gala/",
        timeout: 120 * 1000,
        reuseExistingServer: false,
      }
    : undefined,
  use: {
    baseURL: CI ? "http://localhost:4173/gala/" : "http://localhost/gala/",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    contextOptions: { reducedMotion: "reduce" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    ...(process.env.CI
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
});
