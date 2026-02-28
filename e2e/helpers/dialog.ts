import { type Page, type Locator, expect } from "@playwright/test";

/** ダイアログが開いてタイトルが表示されるのを待つ */
export async function expectDialogOpen(
  page: Page,
  title: string,
): Promise<Locator> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(title)).toBeVisible();
  return dialog;
}

/** ボタンクリックでダイアログを開く */
export async function openDialog(
  page: Page,
  triggerText: string,
  dialogTitle: string,
): Promise<Locator> {
  await page.getByRole("button", { name: triggerText }).click();
  return expectDialogOpen(page, dialogTitle);
}

/** Escape キーでダイアログを閉じる */
export async function closeDialog(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

/** ダイアログ内のフィールド(ラベルまたはテキスト)が表示されていることを確認 */
export async function expectDialogField(dialog: Locator, labelText: string) {
  await expect(
    dialog.getByLabel(labelText).or(dialog.getByText(labelText)),
  ).toBeVisible();
}
