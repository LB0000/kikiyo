import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { expectErrorToast } from "../../helpers/toast";

test.describe("Login Page (/login)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login form with Japanese labels", async ({ page }) => {
    await expect(page.getByText(JP.LOGIN_DESCRIPTION)).toBeVisible();
    await expect(page.getByLabel(JP.EMAIL_LABEL)).toBeVisible();
    await expect(page.getByLabel(JP.PASSWORD_LABEL)).toBeVisible();
    await expect(
      page.getByRole("button", { name: JP.LOGIN_BUTTON }),
    ).toBeEnabled();
  });

  test("should display Live Manager branding", async ({ page }) => {
    await expect(page.getByText("Live Manager")).toBeVisible();
    await expect(page.getByAltText("KIKIYO")).toBeVisible();
  });

  test("should show error toast on invalid credentials", async ({ page }) => {
    await page.getByLabel(JP.EMAIL_LABEL).fill("invalid@example.com");
    await page.getByLabel(JP.PASSWORD_LABEL).fill("wrongpassword");
    await page.getByRole("button", { name: JP.LOGIN_BUTTON }).click();
    await expectErrorToast(page, JP.LOGIN_ERROR);
  });

  test("should show loading state during login", async ({ page }) => {
    await page.getByLabel(JP.EMAIL_LABEL).fill("invalid@example.com");
    await page.getByLabel(JP.PASSWORD_LABEL).fill("wrongpassword");

    // ネットワーク応答を遅延させてloading stateを安定的にキャプチャ
    await page.route("**/auth/v1/token*", async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    });
    await page.getByRole("button", { name: JP.LOGIN_BUTTON }).click();
    // ボタンが一時的に disabled になる
    await expect(
      page.getByRole("button", { name: JP.LOGGING_IN }),
    ).toBeVisible();
  });

  test("should require email and password fields", async ({ page }) => {
    const emailInput = page.getByLabel(JP.EMAIL_LABEL);
    const passwordInput = page.getByLabel(JP.PASSWORD_LABEL);
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("required", "");
  });

  test("should open forgot password dialog", async ({ page }) => {
    await page.getByText(JP.FORGOT_PASSWORD).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(JP.PASSWORD_RESET_TITLE)).toBeVisible();
    await expect(dialog.getByText(JP.PASSWORD_RESET_DESC)).toBeVisible();
    await expect(dialog.getByLabel(JP.EMAIL_LABEL)).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: JP.RESET_SEND_BUTTON }),
    ).toBeVisible();
  });

  test("should close forgot password dialog with Escape", async ({ page }) => {
    await page.getByText(JP.FORGOT_PASSWORD).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should require email in reset dialog", async ({ page }) => {
    await page.getByText(JP.FORGOT_PASSWORD).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const resetEmail = dialog.getByLabel(JP.EMAIL_LABEL);
    await expect(resetEmail).toHaveAttribute("required", "");
  });
});
