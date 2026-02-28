import { test, expect } from "@playwright/test";

test.describe("All Applications Access Control (agency_user)", () => {
  test("agency_user should be redirected from /all-applications to /dashboard", async ({
    page,
  }) => {
    await page.goto("/all-applications");
    await page.waitForURL("**/dashboard");
    await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible();
  });
});
