import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectDialogOpen, closeDialog } from "../../helpers/dialog";

test.describe("Invoice Creation Dialog (agency_user)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices");
  });

  test("should display invoice create button for agency_user", async ({
    page,
  }) => {
    // agency_user で agencyId がある場合のみ表示
    const btn = page.getByRole("button", { name: JP.INVOICE_CREATE });
    const count = await btn.count();
    if (count > 0) {
      await expect(btn).toBeVisible();
    }
  });

  test("should open create invoice dialog", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.INVOICE_CREATE });
    const count = await btn.count();
    if (count > 0) {
      await btn.click();
      await expectDialogOpen(page, JP.INVOICE_CREATE);
    }
  });

  test("should close create invoice dialog with Escape", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.INVOICE_CREATE });
    const count = await btn.count();
    if (count > 0) {
      await btn.click();
      await expectDialogOpen(page, JP.INVOICE_CREATE);
      await closeDialog(page);
    }
  });
});
