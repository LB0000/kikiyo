import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectDialogOpen, closeDialog } from "../../helpers/dialog";

test.describe("Agency Create/Edit Dialogs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/agencies", { waitUntil: "networkidle" });
    await expect(page.getByText(JP.AGENCY_LIST)).toBeVisible({ timeout: 30_000 });
  });

  test("should open new agency dialog", async ({ page }) => {
    await page.getByRole("button", { name: JP.AGENCY_REGISTER }).click();
    await expectDialogOpen(page, JP.NEW_AGENCY_TITLE);
  });

  test("should display form fields in new agency dialog", async ({ page }) => {
    await page.getByRole("button", { name: JP.AGENCY_REGISTER }).click();
    const dialog = await expectDialogOpen(page, JP.NEW_AGENCY_TITLE);
    await expect(dialog.getByText("代理店名")).toBeVisible();
    await expect(dialog.getByText("メールアドレス")).toBeVisible();
    await expect(dialog.getByText("手数料率")).toBeVisible();
    await expect(dialog.getByText("代理店ランク")).toBeVisible();
  });

  test("should close new agency dialog with Escape", async ({ page }) => {
    await page.getByRole("button", { name: JP.AGENCY_REGISTER }).click();
    await expectDialogOpen(page, JP.NEW_AGENCY_TITLE);
    await closeDialog(page);
  });

  test("should open edit dialog when clicking agency row action", async ({
    page,
  }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    if (rowCount > 0) {
      await rows.first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
    }
  });
});
