import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectErrorToast } from "../../helpers/toast";
import { INVALID } from "../../helpers/test-data";

test.describe("Reset Password Page (/reset-password)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reset-password");
  });

  test("should display password reset form", async ({ page }) => {
    await expect(page.getByText(JP.RESET_PAGE_TITLE)).toBeVisible();
    await expect(page.getByText(JP.RESET_PAGE_DESC)).toBeVisible();
    await expect(
      page.getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(JP.CONFIRM_PASSWORD_LABEL)).toBeVisible();
    await expect(
      page.getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON }),
    ).toBeVisible();
  });

  test("should display KIKIYO branding", async ({ page }) => {
    await expect(page.getByAltText("KIKIYO")).toBeVisible();
  });

  test("should show error for mismatched passwords", async ({ page }) => {
    await page
      .getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true })
      .fill(INVALID.VALID_PASSWORD);
    await page
      .getByLabel(JP.CONFIRM_PASSWORD_LABEL)
      .fill("DifferentPass1");
    await page
      .getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON })
      .click();
    await expectErrorToast(page, JP.PASSWORD_MISMATCH);
  });

  // HTML5 minLength属性がブラウザバリデーションを先に発火するため、スキップ
  test.skip("should show error for short password", async ({ page }) => {
    await page
      .getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true })
      .fill(INVALID.SHORT_PASSWORD);
    await page
      .getByLabel(JP.CONFIRM_PASSWORD_LABEL)
      .fill(INVALID.SHORT_PASSWORD);
    await page
      .getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON })
      .click();
    await expectErrorToast(page, JP.PASSWORD_TOO_SHORT);
  });

  test("should show error for password without uppercase", async ({ page }) => {
    await page
      .getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true })
      .fill(INVALID.NO_UPPER_PASSWORD);
    await page
      .getByLabel(JP.CONFIRM_PASSWORD_LABEL)
      .fill(INVALID.NO_UPPER_PASSWORD);
    await page
      .getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON })
      .click();
    await expectErrorToast(page, JP.PASSWORD_COMPLEXITY);
  });

  test("should show error for password without lowercase", async ({ page }) => {
    await page
      .getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true })
      .fill(INVALID.NO_LOWER_PASSWORD);
    await page
      .getByLabel(JP.CONFIRM_PASSWORD_LABEL)
      .fill(INVALID.NO_LOWER_PASSWORD);
    await page
      .getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON })
      .click();
    await expectErrorToast(page, JP.PASSWORD_COMPLEXITY);
  });

  test("should show error for password without digits", async ({ page }) => {
    await page
      .getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true })
      .fill(INVALID.NO_DIGIT_PASSWORD);
    await page
      .getByLabel(JP.CONFIRM_PASSWORD_LABEL)
      .fill(INVALID.NO_DIGIT_PASSWORD);
    await page
      .getByRole("button", { name: JP.UPDATE_PASSWORD_BUTTON })
      .click();
    await expectErrorToast(page, JP.PASSWORD_COMPLEXITY);
  });

  test("should require both fields", async ({ page }) => {
    const pwd = page.getByLabel(JP.NEW_PASSWORD_LABEL, { exact: true });
    const confirm = page.getByLabel(JP.CONFIRM_PASSWORD_LABEL);
    await expect(pwd).toHaveAttribute("required", "");
    await expect(confirm).toHaveAttribute("required", "");
  });
});
