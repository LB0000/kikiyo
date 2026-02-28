import { type Page, expect } from "@playwright/test";

/** テーブルが表示されるまで待つ */
export async function waitForTable(page: Page) {
  const table = page.locator("table").first();
  await expect(table).toBeVisible({ timeout: 15_000 });
  return table;
}

/** テーブルの行数を取得 */
export async function getTableRowCount(page: Page): Promise<number> {
  return page.locator("table tbody tr").count();
}

/** テーブルの指定行をクリック */
export async function clickTableRow(page: Page, index: number) {
  await page.locator("table tbody tr").nth(index).click();
}

/** テーブルが空でないことをアサート */
export async function expectTableNotEmpty(page: Page) {
  const count = await getTableRowCount(page);
  expect(count).toBeGreaterThan(0);
}

/** 検索入力欄にテキストを入力してフィルタリング */
export async function searchTable(
  page: Page,
  placeholder: string,
  text: string,
) {
  const input = page.getByPlaceholder(placeholder);
  await input.fill(text);
  await page.waitForTimeout(500);
}

/** 結果件数の表示を確認 */
export async function expectResultCount(page: Page) {
  await expect(page.getByText(/\d+件/).first()).toBeVisible();
}
