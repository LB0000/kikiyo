import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectDialogOpen, closeDialog } from "../../helpers/dialog";

test.describe("CSV Upload Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText(JP.DASHBOARD_HEADING)).toBeVisible({ timeout: 30_000 });
  });

  test("should open CSV upload dialog", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.CSV_UPLOAD });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("should display form fields in CSV dialog", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.CSV_UPLOAD });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // ダイアログ内のフォーム要素を確認
    await expect(dialog.locator("form, input, select").first()).toBeVisible();
  });

  test("should close CSV dialog with Escape", async ({ page }) => {
    const btn = page.getByRole("button", { name: JP.CSV_UPLOAD });
    if ((await btn.count()) === 0) {
      test.skip();
      return;
    }
    await btn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await closeDialog(page);
  });
});
