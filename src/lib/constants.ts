import type { UserRole, ApplicationStatus, AgencyRank, FormTab, RevenueTask, AccountType, PayeeKind } from "./supabase/types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  system_admin: "システム管理者",
  agency_user: "代理店ユーザー",
  // 要望#4: 専用ナビ/権限の配線は 4-D で実装。ここではラベルのみ先行追加。
  manager_user: "マネージャー",
  scout_user: "スカウト",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  completed: "完了",
  released: "解除",
  authorized: "権限付与",
  pending: "未承諾",
  rejected: "否認",
};

export const AGENCY_RANK_LABELS: Record<AgencyRank, string> = {
  rank_2: "2次代理店",
  rank_3: "3次代理店",
  rank_4: "4次代理店",
};

export const FORM_TAB_LABELS: Record<FormTab, string> = {
  affiliation_check: "事務所（所属）登録申請",
  streaming_auth: "配信権限付与",
  subscription_cancel: "所属解除（退所）申請",
  account_id_change: "アカウントID変更",
  event_build: "イベント構築申請",
  special_referral: "特別送客申請",
  objection: "事務所用 異議申し立て",
};

export const TICKET_TYPE_LABELS: Record<string, string> = {
  general: "一般",
  gold: "ゴールドチケット",
  high_follower: "フォロワー多数クリエイター",
  premium: "プレミアム",
};

export const REVENUE_TASK_LABELS: Record<RevenueTask, string> = {
  task_1: "タスク1",
  task_2: "タスク2",
  task_3: "タスク3",
  task_4: "タスク4",
  task_5: "タスク5",
  task_6_plus: "タスク6以上",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  futsu: "普通",
  toza: "当座",
};

// 要望#4: 分配先種別の表示ラベル。
export const PAYEE_KIND_LABELS: Record<PayeeKind, string> = {
  total_side: "トータルサイド",
  manager: "マネージャー",
  agency: "三次代理店",
  scout: "スカウト",
};

// 要望#4: アクセス不可ページからのリダイレクト先（ロール別の既定ホーム）。
// - scout_user: 分配明細のみ → /distributions
// - admin / agency_user / manager_user: 生データ画面が既定 → /dashboard
// 各ページのガードは「許可ロールの否定」で書き（負の定数に依存しない）、不許可時に本関数で遷移する。
//   dashboard / livers: scout_user のみ不可
//   invoices / applications: admin / agency_user のみ可（manager/scout 不可）
//   agencies / all-applications: admin のみ可
export function fallbackPathForRole(role: UserRole): string {
  return role === "scout_user" ? "/distributions" : "/dashboard";
}

/** 消費税率（10%） */
export const CONSUMPTION_TAX_RATE = 0.1;

/** インボイス未登録の支払先に適用するロイヤリティ控除率（2%・2026-07発注元ルール） */
export const INVOICE_ROYALTY_RATE = 0.02;

/** 税込み乗数（1 + 消費税率） — ダッシュボード計算用 */
export const TAX_MULTIPLIER = 1 + CONSUMPTION_TAX_RATE;

export type NavItem = {
  title: string;
  href: string;
  roles: UserRole[];
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "ライバー名簿",
    href: "/livers",
    roles: ["system_admin", "agency_user", "manager_user"],
    icon: "users",
  },
  {
    title: "代理店一覧",
    href: "/agencies",
    roles: ["system_admin"],
    icon: "building2",
  },
  {
    title: "TikTokバックエンド",
    href: "/dashboard",
    roles: ["system_admin", "agency_user", "manager_user"],
    icon: "monitor",
  },
  {
    title: "TikTok Backstage",
    href: "https://live-backstage.tiktok.com/",
    roles: ["system_admin", "agency_user"],
    icon: "external-link",
  },
  {
    title: "申請一覧",
    href: "/all-applications",
    roles: ["system_admin"],
    icon: "list-ordered",
  },
  {
    title: "TikTok申請",
    href: "/applications",
    roles: ["system_admin", "agency_user"],
    icon: "file-text",
  },
  {
    title: "請求書",
    href: "/invoices",
    roles: ["system_admin", "agency_user"],
    icon: "receipt",
  },
  {
    // 要望#4: 分配明細。admin=全件、マネージャー=担当分、スカウト=自分分（RLSスコープ）。
    title: "分配明細",
    href: "/distributions",
    roles: ["system_admin", "manager_user", "scout_user"],
    icon: "coins",
  },
];
