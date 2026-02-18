import type { UserRole, ApplicationStatus, AgencyRank, FormTab, RevenueTask } from "./supabase/types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  system_admin: "システム管理者",
  agency_user: "代理店ユーザー",
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
  affiliation_check: "紐付け申請（事務所所属チェック）",
  million_special: "100万人以上特別申請",
  streaming_auth: "配信権限付与",
  subscription_cancel: "サブスク解除申請",
  account_id_change: "アカウントID変更",
  event_build: "イベント構築申請",
  special_referral: "特別送客申請",
  objection: "事務所用 異議申し立て",
};

export const REVENUE_TASK_LABELS: Record<RevenueTask, string> = {
  task_1: "タスク1",
  task_2: "タスク2",
  task_3: "タスク3",
  task_4: "タスク4",
  task_5: "タスク5",
  task_6_plus: "タスク6以上",
};

export const TAX_RATE = 1.1;

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
];
