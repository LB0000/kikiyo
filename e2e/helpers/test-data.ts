/**
 * テスト識別子・バリデーション用無効値
 */

export const TEST_DATA_PREFIX = "e2e_";

/** バリデーション発火用の無効パスワード */
export const INVALID = {
  SHORT_PASSWORD: "Ab1",
  NO_UPPER_PASSWORD: "abcdefg1",
  NO_LOWER_PASSWORD: "ABCDEFG1",
  NO_DIGIT_PASSWORD: "Abcdefgh",
  VALID_PASSWORD: "TestPass1",
} as const;

/** 申請フォームの全7タブ */
export const FORM_TABS = {
  AFFILIATION_CHECK: "事務所（所属）登録申請",
  STREAMING_AUTH: "配信権限付与",
  SUBSCRIPTION_CANCEL: "所属解除（退所）申請",
  ACCOUNT_ID_CHANGE: "アカウントID変更",
  EVENT_BUILD: "イベント構築申請",
  SPECIAL_REFERRAL: "特別送客申請",
  OBJECTION: "事務所用 異議申し立て",
} as const;
