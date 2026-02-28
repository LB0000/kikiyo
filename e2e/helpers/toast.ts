import { type Page, expect } from "@playwright/test";

/** sonner toast の表示をアサート */
export async function expectToast(page: Page, text: string) {
  const toast = page.locator("[data-sonner-toast]", { hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
}

export async function expectSuccessToast(page: Page, text: string) {
  const toast = page.locator('[data-sonner-toast][data-type="success"]', {
    hasText: text,
  });
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
}

export async function expectErrorToast(page: Page, text: string) {
  const toast = page.locator('[data-sonner-toast][data-type="error"]', {
    hasText: text,
  });
  await expect(toast.first()).toBeVisible({ timeout: 10_000 });
}

/** 表示中のトーストを全て閉じる */
export async function dismissToasts(page: Page) {
  const toasts = page.locator("[data-sonner-toast]");
  const count = await toasts.count();
  for (let i = 0; i < count; i++) {
    const closeBtn = toasts.nth(i).locator('[data-close-button="true"]');
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  }
}
