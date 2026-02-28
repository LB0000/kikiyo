import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "e2e/.env.test") });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: process.env.CI ? 2 : 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }], ["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },

  timeout: 60_000,
  expect: { timeout: 10_000 },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "e2e/.auth/admin.json"),
      },
      dependencies: ["setup"],
      testMatch: /specs\/(dashboard|agencies|all-applications|navigation|livers|invoices|settings)\/.+\.spec\.ts/,
      testIgnore: /(access|login|reset-password|route-protection|logout)\.spec\.ts/,
    },
    {
      name: "agency",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "e2e/.auth/agency.json"),
      },
      dependencies: ["setup"],
      testMatch: /specs\/(dashboard|livers|applications|invoices|settings)\/.+\.spec\.ts/,
      testIgnore: /(crud|access|rate)\.spec\.ts/,
    },
    {
      name: "access-agency",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "e2e/.auth/agency.json"),
      },
      dependencies: ["setup"],
      testMatch: /access\.spec\.ts/,
    },
    {
      // logout はセッションを無効化するため、他の admin テスト完了後に実行
      name: "admin-logout",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["admin"],
      testMatch: /logout\.spec\.ts/,
    },
    {
      name: "auth",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /specs\/auth\/(login|reset-password)\.spec\.ts/,
    },
    {
      name: "auth-routes",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /route-protection\.spec\.ts/,
    },
  ],

  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
