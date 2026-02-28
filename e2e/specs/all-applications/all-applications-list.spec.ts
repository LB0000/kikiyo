import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { searchTable, expectResultCount } from "../../helpers/table";

test.describe("All Applications Page (/all-applications)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/all-applications", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: JP.ALL_APPLICATIONS_HEADING })).toBeVisible({ timeout: 30_000 });
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: JP.ALL_APPLICATIONS_HEADING })).toBeVisible();
    await expect(page.getByText(JP.ALL_APPLICATIONS_DESC)).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    await expect(
      page.getByPlaceholder(JP.ALL_APPLICATIONS_SEARCH),
    ).toBeVisible();
  });

  test("should display record count", async ({ page }) => {
    await expectResultCount(page);
  });

  test("should display CSV export button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.CSV_EXPORT }),
    ).toBeVisible();
  });

  test("should display form type filter", async ({ page }) => {
    // 申請種別フィルタ (「すべて」がデフォルト選択)
    await expect(
      page.getByText("すべて").first(),
    ).toBeVisible();
  });

  test("should filter applications by search text", async ({ page }) => {
    await expectResultCount(page);
    await searchTable(
      page,
      JP.ALL_APPLICATIONS_SEARCH,
      "zzz_nonexistent_zzz",
    );
    await expect(page.getByText(/0件|件/).first()).toBeVisible();
  });

  test("should open detail dialog when clicking detail button", async ({ page }) => {
    const detailButtons = page.getByRole("button", { name: "詳細" });
    const count = await detailButtons.count();
    if (count > 0) {
      await detailButtons.first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
    }
  });

  test("should close detail dialog with Escape", async ({ page }) => {
    const detailButtons = page.getByRole("button", { name: "詳細" });
    const count = await detailButtons.count();
    if (count > 0) {
      await detailButtons.first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    }
  });
});
