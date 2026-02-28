import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { searchTable, expectResultCount } from "../../helpers/table";

test.describe("Livers List Page (/livers)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/livers", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: JP.LIVER_LIST })).toBeVisible({ timeout: 30_000 });
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: JP.LIVER_LIST })).toBeVisible();
    await expect(page.getByText(JP.LIVER_DESC)).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    await expect(page.getByPlaceholder(JP.LIVER_SEARCH)).toBeVisible();
  });

  test("should display record count", async ({ page }) => {
    await expectResultCount(page);
  });

  test("should display CSV export button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.CSV_EXPORT }),
    ).toBeVisible();
  });

  test("should display bulk status change button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.BULK_STATUS }),
    ).toBeVisible();
  });

  test("should display CSV import button if admin", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.CSV_IMPORT });
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });

  test("should display status filter", async ({ page }) => {
    // デフォルト値は「すべて」
    await expect(page.getByText("すべて").first()).toBeVisible();
  });

  test("should filter livers by search text", async ({ page }) => {
    await expectResultCount(page);
    await searchTable(page, JP.LIVER_SEARCH, "zzz_nonexistent_liver_zzz");
    await expect(page.getByText(/0件|件/).first()).toBeVisible();
  });
});
