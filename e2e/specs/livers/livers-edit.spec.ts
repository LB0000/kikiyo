import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { clickTableRow } from "../../helpers/table";

test.describe("Liver Edit Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/livers");
  });

  test("should open edit dialog when clicking a liver row", async ({
    page,
  }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    if (rowCount > 0) {
      await clickTableRow(page, 0);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(JP.LIVER_EDIT_TITLE)).toBeVisible();
    }
  });

  test("should display form fields in edit dialog", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    if (rowCount > 0) {
      await clickTableRow(page, 0);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // 主要なフォームフィールドを確認
      await expect(dialog.getByText("氏名")).toBeVisible();
      await expect(dialog.getByText("TikTokユーザー名")).toBeVisible();
      await expect(dialog.getByText("メールアドレス")).toBeVisible();
    }
  });

  test("should close edit dialog with Escape", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    if (rowCount > 0) {
      await clickTableRow(page, 0);
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
  });
});
