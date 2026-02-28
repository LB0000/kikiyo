import { type Page, expect } from "@playwright/test";

/** サイドバーリンクでページ遷移 */
export async function navigateTo(
  page: Page,
  linkText: string,
  expectedPath: string,
) {
  await page.getByRole("link", { name: linkText }).click();
  await page.waitForURL(`**${expectedPath}`);
}

/** サイドバーのメニュー項目が表示されていることを確認 */
export async function expectNavItem(page: Page, menuText: string) {
  const sidebar = page.locator("[data-sidebar='sidebar']");
  await expect(sidebar.getByText(menuText, { exact: true })).toBeVisible();
}

/** サイドバーのメニュー項目が非表示であることを確認 */
export async function expectNoNavItem(page: Page, menuText: string) {
  const sidebar = page.locator("[data-sidebar='sidebar']");
  await expect(
    sidebar.getByText(menuText, { exact: true }),
  ).not.toBeVisible();
}

/** アクティブなナビ項目を確認 (data-active="true") */
export async function expectActiveNavItem(page: Page, menuText: string) {
  // SidebarMenuButton (asChild) が data-active を <a> 要素に直接付与する
  const link = page
    .locator("[data-sidebar='sidebar']")
    .getByRole("link", { name: menuText });
  await expect(link).toHaveAttribute("data-active", "true");
}

/** ユーザーメールがサイドバーに表示されていることを確認 */
export async function expectUserEmail(page: Page, email: string) {
  const sidebar = page.locator("[data-sidebar='sidebar']");
  await expect(sidebar.getByText(email, { exact: true })).toBeVisible();
}
