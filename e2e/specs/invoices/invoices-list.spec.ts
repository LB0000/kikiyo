import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { searchTable, expectResultCount } from "../../helpers/table";

test.describe("Invoices List Page (/invoices)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByText(JP.INVOICE_LIST)).toBeVisible();
    await expect(page.getByText(JP.INVOICE_DESC)).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    await expect(page.getByPlaceholder(JP.INVOICE_SEARCH)).toBeVisible();
  });

  test("should display record count", async ({ page }) => {
    await expectResultCount(page);
  });

  test("should filter invoices by search text", async ({ page }) => {
    await expectResultCount(page);
    await searchTable(page, JP.INVOICE_SEARCH, "zzz_nonexistent_zzz");
    await expect(page.getByText(/0件|件/).first()).toBeVisible();
  });
});
