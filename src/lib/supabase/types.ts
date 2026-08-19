// ============================================================================
// Supabase 型エイリアス
// DB スキーマ型本体は ./database.types.ts（`supabase gen types` で自動生成）。
// ここでは生成型から導出したアプリ用エイリアスのみを定義し、enum 値の重複定義を避ける。
// ============================================================================
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

type PublicEnums = Database["public"]["Enums"];

// 要望#4: マネージャー代表者(manager_user)・スカウト(scout_user)がログイン主体に追加。
// DB側 enum は supabase/migrations/032_add_manager_scout_roles.sql。
export type UserRole = PublicEnums["user_role"];
export type ApplicationStatus = PublicEnums["application_status"];
export type AgencyRank = PublicEnums["agency_rank"];
export type FormTab = PublicEnums["form_tab"];
export type RevenueTask = PublicEnums["revenue_task"];
export type AccountType = PublicEnums["account_type"];
// 要望#4: 分配先種別（DB enum payee_kind / 033）。distributions・distribution_rules で使用。
export type PayeeKind = PublicEnums["payee_kind"];

// 行型の短縮ヘルパー（例: Tables<"agencies">）
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
