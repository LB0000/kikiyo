import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { navigateTo, expectNavItem, expectActiveNavItem } from "../../helpers/nav";

// admin プロジェクトのみで実行（agency は navigation を除外済み）
test.describe("Sidebar Navigation (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.locator("[data-sidebar='sidebar']")).toBeVisible({ timeout: 15_000 });
  });

  test("should display all admin nav items", async ({ page }) => {
    await expectNavItem(page, JP.NAV_LIVERS);
    await expectNavItem(page, JP.NAV_AGENCIES);
    await expectNavItem(page, JP.NAV_DASHBOARD);
    await expectNavItem(page, JP.NAV_BACKSTAGE);
    await expectNavItem(page, JP.NAV_ALL_APPS);
    await expectNavItem(page, JP.NAV_APPS);
    await expectNavItem(page, JP.NAV_INVOICES);
  });

  test("should display menu label", async ({ page }) => {
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar.getByText(JP.SIDEBAR_MENU_LABEL)).toBeVisible();
  });

  test("should show active state for current page", async ({ page }) => {
    await expectActiveNavItem(page, JP.NAV_DASHBOARD);
  });

  test("should navigate to livers page", async ({ page }) => {
    await navigateTo(page, JP.NAV_LIVERS, "/livers");
    await expect(page.getByRole("heading", { name: JP.LIVER_LIST })).toBeVisible();
  });

  test("should navigate to agencies page", async ({ page }) => {
    await navigateTo(page, JP.NAV_AGENCIES, "/agencies");
    await expect(page.getByRole("heading", { name: JP.AGENCY_LIST })).toBeVisible();
  });

  test("should navigate to applications page", async ({ page }) => {
    await navigateTo(page, JP.NAV_APPS, "/applications");
    await expect(page.getByRole("heading", { name: JP.APPLICATION_HEADING })).toBeVisible();
  });

  test("should navigate to all-applications page", async ({ page }) => {
    await navigateTo(page, JP.NAV_ALL_APPS, "/all-applications");
    await expect(page.getByRole("heading", { name: JP.ALL_APPLICATIONS_HEADING })).toBeVisible();
  });

  test("should navigate to invoices page", async ({ page }) => {
    await navigateTo(page, JP.NAV_INVOICES, "/invoices");
    await expect(page.getByRole("heading", { name: JP.INVOICE_LIST })).toBeVisible();
  });

  test("should navigate to settings via password change link", async ({
    page,
  }) => {
    await page.getByRole("link", { name: JP.PASSWORD_CHANGE }).click();
    await page.waitForURL("**/settings");
    await expect(page.getByRole("heading", { name: JP.SETTINGS_HEADING })).toBeVisible();
  });

  test("TikTok Backstage link should open in new tab", async ({ page }) => {
    const link = page.getByRole("link", { name: JP.NAV_BACKSTAGE });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  });

  test("should display logout button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.LOGOUT_BUTTON }),
    ).toBeVisible();
  });

  test("should display user email in sidebar footer", async ({ page }) => {
    const sidebar = page.locator("[data-sidebar='sidebar']");
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      // メールアドレス全体で完全一致（prefix は name 表示と重複する）
      await expect(sidebar.getByText(adminEmail, { exact: true })).toBeVisible();
    }
  });
});
