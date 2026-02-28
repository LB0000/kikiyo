import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { searchTable, expectResultCount } from "../../helpers/table";

test.describe("Agencies List Page (/agencies)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/agencies", { waitUntil: "networkidle" });
    // サーバーコンポーネントのデータ取得完了を待つ
    await expect(page.getByText(JP.AGENCY_LIST)).toBeVisible({ timeout: 30_000 });
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByText(JP.AGENCY_LIST)).toBeVisible();
    await expect(page.getByText(JP.AGENCY_DESC)).toBeVisible();
  });

  test("should display search input", async ({ page }) => {
    await expect(page.getByPlaceholder(JP.AGENCY_SEARCH)).toBeVisible();
  });

  test("should display agency registration button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.AGENCY_REGISTER }),
    ).toBeVisible();
  });

  test("should display CSV export button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.CSV_EXPORT }),
    ).toBeVisible();
  });

  test("should display record count", async ({ page }) => {
    await expectResultCount(page);
  });

  test("should filter agencies by search text", async ({ page }) => {
    await expectResultCount(page);
    await searchTable(page, JP.AGENCY_SEARCH, "zzz_nonexistent_agency_zzz");
    await expect(page.getByText(/0件|件/).first()).toBeVisible();
  });

  test("should display rank filter", async ({ page }) => {
    await expect(
      page.getByRole("combobox", { name: JP.AGENCY_RANK_FILTER }),
    ).toBeVisible();
  });

  test("should display status filter", async ({ page }) => {
    await expect(
      page.getByText("すべて").first(),
    ).toBeVisible();
  });
});
