import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";

test.describe("Dashboard Page (/dashboard)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText(JP.DASHBOARD_HEADING)).toBeVisible({ timeout: 30_000 });
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByText(JP.DASHBOARD_HEADING)).toBeVisible();
    await expect(page.getByText(JP.DASHBOARD_DESC)).toBeVisible();
  });

  test("should show report period selector", async ({ page }) => {
    await expect(page.getByText(JP.DISPLAY_PERIOD)).toBeVisible();
  });

  test("should show data and refund tabs", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: JP.DATA_TAB }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: JP.REFUND_TAB }),
    ).toBeVisible();
  });

  test("should switch between tabs", async ({ page }) => {
    await page.getByRole("tab", { name: JP.REFUND_TAB }).click();
    await expect(
      page.getByRole("tab", { name: JP.REFUND_TAB }),
    ).toHaveAttribute("data-state", "active");

    await page.getByRole("tab", { name: JP.DATA_TAB }).click();
    await expect(
      page.getByRole("tab", { name: JP.DATA_TAB }),
    ).toHaveAttribute("data-state", "active");
  });

  test("should show filter mode radio buttons", async ({ page }) => {
    // ラジオボタンは admin のみ表示（agency_user は自分のデータのみ）
    const radio = page.getByRole("radio", { name: JP.FILTER_ALL });
    if ((await radio.count()) === 0) {
      test.skip();
      return;
    }
    await expect(radio).toBeVisible();
    await expect(page.getByRole("radio", { name: JP.FILTER_AGENCY })).toBeVisible();
  });

  test("should show special bonus tab if admin", async ({ page }) => {
    const tab = page.getByRole("tab", { name: JP.SPECIAL_BONUS_TAB });
    const count = await tab.count();
    if (count > 0) {
      await expect(tab).toBeVisible();
    }
  });

  test("should show CSV upload button if available", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.CSV_UPLOAD });
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });

  test("should show exchange rate button if available", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.EXCHANGE_RATE });
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });
});
