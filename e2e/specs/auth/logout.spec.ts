import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";

/** Next.js dev overlay を削除（ログアウトボタンを遮るため） */
async function removeDevOverlay(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
}

/** 手動ログイン（admin-logout プロジェクトは storageState なし） */
async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "networkidle" });
  const emailInput = page.getByLabel("メールアドレス");
  await expect(emailInput).toBeVisible();
  await emailInput.click();
  await emailInput.fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("パスワード").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({ timeout: 15_000 });
}

// admin-logout プロジェクトで実行（admin テスト完了後）
test.describe("Logout Flow", () => {
  test("should log out and redirect to /login", async ({ page }) => {
    await loginAsAdmin(page);

    await removeDevOverlay(page);
    await page.getByRole("button", { name: JP.LOGOUT_BUTTON }).click();
    await page.waitForURL("**/login", { timeout: 30_000 });
    await expect(page.getByText(JP.LOGIN_DESCRIPTION)).toBeVisible();
  });

  test("should not access protected page after logout", async ({ page }) => {
    await loginAsAdmin(page);

    await removeDevOverlay(page);
    await page.getByRole("button", { name: JP.LOGOUT_BUTTON }).click();
    await page.waitForURL("**/login", { timeout: 30_000 });

    // ログアウト後に保護ページへアクセス → /login にリダイレクト
    await page.goto("/dashboard", { waitUntil: "commit" });
    await page.waitForURL("**/login", { timeout: 30_000 });
  });
});
