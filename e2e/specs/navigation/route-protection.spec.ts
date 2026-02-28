import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";

// auth-routes プロジェクト (storageState なし) で実行
test.describe("Route Protection (unauthenticated)", () => {
  const protectedRoutes = [
    "/dashboard",
    "/livers",
    "/agencies",
    "/applications",
    "/all-applications",
    "/invoices",
    "/settings",
  ];

  for (const route of protectedRoutes) {
    test(`${route} should redirect to /login`, async ({ page }) => {
      await page.goto(route, { timeout: 30_000 });
      await page.waitForURL("**/login", { timeout: 30_000 });
      await expect(page.getByText(JP.LOGIN_DESCRIPTION)).toBeVisible();
    });
  }

  test("/login should be accessible without auth", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByText(JP.LOGIN_DESCRIPTION)).toBeVisible();
    await expect(page.getByLabel(JP.EMAIL_LABEL)).toBeVisible();
  });

  test("/reset-password should be accessible without auth", async ({
    page,
  }) => {
    await page.goto("/reset-password", { waitUntil: "networkidle" });
    await expect(page.getByText(JP.RESET_PAGE_TITLE)).toBeVisible();
  });

  test("/ should redirect to /login", async ({ page }) => {
    await page.goto("/", { timeout: 30_000 });
    await page.waitForURL("**/login", { timeout: 30_000 });
  });
});
