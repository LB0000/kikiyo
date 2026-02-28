import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectDialogOpen, closeDialog } from "../../helpers/dialog";

test.describe("Refund Tab & Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
  });

  test("should switch to refund tab", async ({ page }) => {
    await page.getByRole("tab", { name: JP.REFUND_TAB }).click();
    await expect(
      page.getByRole("tab", { name: JP.REFUND_TAB }),
    ).toHaveAttribute("data-state", "active");
  });

  test("should open refund registration dialog if available", async ({
    page,
  }) => {
    const btn = page.getByRole("button", { name: JP.REFUND_REGISTER });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    const dialog = await expectDialogOpen(page, JP.REFUND_DIALOG_TITLE);
    await expect(dialog.locator("form")).toBeVisible();
  });

  test("should close refund dialog with Escape", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.REFUND_REGISTER });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    await expectDialogOpen(page, JP.REFUND_DIALOG_TITLE);
    await closeDialog(page);
  });
});
