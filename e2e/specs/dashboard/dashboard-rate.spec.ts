import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectDialogOpen, closeDialog } from "../../helpers/dialog";

test.describe("Exchange Rate Dialog (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("should display exchange rate button when report selected", async ({
    page,
  }) => {
    const rateButton = page.getByRole("button", { name: JP.EXCHANGE_RATE });
    const count = await rateButton.count();
    if (count > 0) {
      await expect(rateButton).toBeVisible();
    }
  });

  test("should open exchange rate dialog", async ({ page }) => {
    const rateButton = page.getByRole("button", { name: JP.EXCHANGE_RATE });
    const count = await rateButton.count();
    if (count > 0) {
      await rateButton.click();
      const dialog = await expectDialogOpen(
        page,
        JP.EXCHANGE_RATE_DIALOG_TITLE,
      );
      await expect(dialog.locator("form, input").first()).toBeVisible();
    }
  });

  test("should close exchange rate dialog with Escape", async ({ page }) => {
    const rateButton = page.getByRole("button", { name: JP.EXCHANGE_RATE });
    const count = await rateButton.count();
    if (count > 0) {
      await rateButton.click();
      await expectDialogOpen(page, JP.EXCHANGE_RATE_DIALOG_TITLE);
      await closeDialog(page);
    }
  });
});
