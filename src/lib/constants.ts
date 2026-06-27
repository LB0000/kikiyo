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

// 要望#4(4-D MVP): 分配明細のみ閲覧するロール。これらは代理店向けの各ページに入れず
// /distributions へ集約する（生データ閲覧の既存ページ流用は次フェーズ）。
export const DISTRIBUTION_ONLY_ROLES: readonly UserRole[] = ["manager_user", "scout_user"];

/** 消費税率（10%） */
export const CONSUMPTION_TAX_RATE = 0.1;

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
    roles: ["system_admin", "agency_user"],
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
    roles: ["system_admin", "agency_user"],
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
