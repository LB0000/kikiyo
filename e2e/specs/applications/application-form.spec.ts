import { test, expect } from "@playwright/test";
import { JP } from "../../helpers/selectors";
import { FORM_TABS } from "../../helpers/test-data";

test.describe("Application Form (/applications)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/applications", { waitUntil: "networkidle" });
  });

  test("should display page heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: JP.APPLICATION_HEADING })).toBeVisible();
    await expect(page.getByText(JP.APPLICATION_DESC)).toBeVisible();
  });

  test("should display step progress indicators", async ({ page }) => {
    await expect(page.getByText(JP.STEP_INPUT, { exact: true })).toBeVisible();
    await expect(page.getByText(JP.STEP_CONFIRM, { exact: true })).toBeVisible();
    await expect(page.getByText(JP.STEP_COMPLETE, { exact: true })).toBeVisible();
  });

  test("should display primary application type options", async ({ page }) => {
    // ラジオボタンのラベルとして表示される（2箇所にマッチする可能性あり）
    await expect(
      page.getByText(FORM_TABS.AFFILIATION_CHECK).first(),
    ).toBeVisible();
    await expect(page.getByText(FORM_TABS.MILLION_SPECIAL).first()).toBeVisible();
    await expect(page.getByText(FORM_TABS.STREAMING_AUTH).first()).toBeVisible();
  });

  test("should show affiliation_check fields by default", async ({ page }) => {
    await expect(page.getByText("TikTokアカウントリンク")).toBeVisible();
    await expect(
      page.getByText("身分証明書を確認しましたか？"),
    ).toBeVisible();
  });

  test("should switch to streaming_auth fields", async ({ page }) => {
    await page.getByText(FORM_TABS.STREAMING_AUTH).first().click();
    await expect(page.getByText("配信理由")).toBeVisible();
  });

  test("should switch to million_special fields", async ({ page }) => {
    await page.getByText(FORM_TABS.MILLION_SPECIAL).first().click();
    await expect(page.getByText("フォロワー数")).toBeVisible();
  });

  test("should show secondary application types when expanded", async ({
    page,
  }) => {
    const expandButton = page.getByText(/その他の申請種別/);
    if ((await expandButton.count()) > 0) {
      await expandButton.click();
      await expect(
        page.getByText(FORM_TABS.SUBSCRIPTION_CANCEL),
      ).toBeVisible();
      await expect(
        page.getByText(FORM_TABS.ACCOUNT_ID_CHANGE),
      ).toBeVisible();
      await expect(page.getByText(FORM_TABS.EVENT_BUILD)).toBeVisible();
      await expect(
        page.getByText(FORM_TABS.SPECIAL_REFERRAL),
      ).toBeVisible();
      await expect(page.getByText(FORM_TABS.OBJECTION)).toBeVisible();
    }
  });

  test("should display common form fields", async ({ page }) => {
    // メールアドレスフィールドは全タブ共通
    await expect(
      page.getByText("メールアドレス").first(),
    ).toBeVisible();
    await expect(
      page.getByText("TikTokユーザー名").first(),
    ).toBeVisible();
  });

  test("should display confirm button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: JP.CONFIRM_BUTTON }),
    ).toBeVisible();
  });
});
