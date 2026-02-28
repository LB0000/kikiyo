import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_FILE = path.resolve(__dirname, ".auth/admin.json");
const AGENCY_FILE = path.resolve(__dirname, ".auth/agency.json");

setup("authenticate as system_admin", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
  // フォームが hydration 完了するまで待つ
  const emailInput = page.getByLabel("メールアドレス");
  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("パスワード").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: ADMIN_FILE });
});

setup("authenticate as agency_user", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle", timeout: 60_000 });
  const emailInput = page.getByLabel("メールアドレス");
  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.fill(process.env.AGENCY_EMAIL!);
  await page.getByLabel("パスワード").fill(process.env.AGENCY_PASSWORD!);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/dashboard", { timeout: 60_000, waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: AGENCY_FILE });
});
