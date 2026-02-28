import { test, expect } from "@playwright/test";

test.describe("Agency Access Control (agency_user)", () => {
  test("agency_user should be redirected from /agencies to /dashboard", async ({
    page,
  }) => {
    await page.goto("/agencies");
    await page.waitForURL("**/dashboard");
    // ダッシュボードに到着していることを確認
    await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible();
  });
});
