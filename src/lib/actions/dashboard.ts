"use server";

import { z } from "zod";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import type { RevenueTask } from "@/lib/supabase/types";
import { TAX_MULTIPLIER } from "@/lib/constants";
import { createRefundSchema } from "@/lib/validations/refund";

const revenueTaskSchema = z.enum([
  "task_1", "task_2", "task_3", "task_4", "task_5", "task_6_plus",
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Bubble ↔ Next.js ボーナスフィールド対応表:
//   Bubble task1  → bonus_rookie_half_milestone (Estimated bonus - Rookie half-milestone bonus task)
//   Bubble task2  → bonus_activeness            (Estimated bonus - Activeness task task)
//   Bubble task3  → bonus_revenue_scale         (Estimated bonus - Revenue scale task task)
//   Bubble task4  → bonus_rookie_milestone_1    (Estimated bonus - Rookie milestone 1 bonus task)
//   Bubble task5  → bonus_rookie_milestone_2    (Estimated bonus - Rookie milestone 2 bonus task)
//   Bubble task6+ → bonus_off_platform          (Estimated bonus - Off-platform creator task task)
//   (Bubbleなし)  → bonus_rookie_retention      (Estimated bonus - Rookie milestone 1 retention bonus task)
type CsvRow = {
  creator_id: string;
  creator_nickname: string;
  handle: string;
  group: string;
  group_manager: string;
  creator_network_manager: string;
  data_month: string;
  diamonds: number;
  estimated_bonus: number;
  valid_days: string;
  live_duration: string;
  is_violative_creators: boolean;
  the_creator_was_rookie_at_the_time_of_first_joining: boolean;
  bonus_rookie_half_milestone: number;
  bonus_activeness: number;
  bonus_revenue_scale: number;
  bonus_rookie_milestone_1: number;
  bonus_rookie_milestone_2: number;
  bonus_off_platform: number;
  bonus_rookie_retention: number;
};

export type MonthlyReportItem = {
  id: string;
  rate: number;
  revenue_task: RevenueTask | null;
  created_at: string;
  data_month: string | null;
};

export type DashboardSummary = {
  totalDiamonds: number;
  totalBonus: number;
  totalRewardJpy: number;
  totalAgencyRewardJpy: number;
  totalRefundJpy: number;
  taxRate: number;
  netAmountExTax: number;
  netAmountIncTax: number;
  agencyPaymentIncTax: number;
  commissionRate: number;
};

export type DashboardData = {
  report: MonthlyReportItem;
  csvRows: Array<{
    id: string;
    creator_id: string | null;
    creator_nickname: string | null;
    handle: string | null;
    group: string | null;
    creator_network_manager: string | null;
    data_month: string | null;
    diamonds: number;
    estimated_bonus: number;
    valid_days: string | null;
    live_duration: string | null;
    total_reward_jpy: number;
    agency_reward_jpy: number;
    liver_id: string | null;
    bonus_rookie_half_milestone: number;
    bonus_rookie_milestone_1: number;
    bonus_rookie_retention: number;
    bonus_rookie_milestone_2: number;
    bonus_activeness: number;
    bonus_off_platform: number;
    bonus_revenue_scale: number;
  }>;
  refunds: Array<{
    id: string;
    target_month: string;
    reason: string | null;
    amount_usd: number;
    amount_jpy: number;
    liver_id: string | null;
  }>;
  summary: DashboardSummary;
};

// ---------------------------------------------------------------------------
// 1. getMonthlyReports
// ---------------------------------------------------------------------------

export async function getMonthlyReports(): Promise<MonthlyReportItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("monthly_reports")
    .select("id, rate, revenue_task, created_at, data_month")
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data;
}

// ---------------------------------------------------------------------------
// 2. getDashboardData
// ---------------------------------------------------------------------------

export async function getDashboardData(
  monthlyReportId: string,
  agencyId?: string
): Promise<DashboardData | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };

  // 代理店ユーザーは自分の閲覧可能代理店のデータのみ取得可能
  if (user.role !== "system_admin" && agencyId) {
    const supabaseCheck = await createClient();
    const { data: viewable } = await supabaseCheck
      .from("profile_viewable_agencies")
      .select("agency_id")
      .eq("profile_id", user.id);
    const viewableIds = (viewable ?? []).map((v) => v.agency_id);
    if (!viewableIds.includes(agencyId)) {
      return { error: "権限がありません" };
    }
  }

  const supabase = await createClient();

  // report, csv_data, refunds を全て並列取得（必要カラムのみ SELECT）
  const reportQuery = supabase
    .from("monthly_reports")
    .select("id, rate, revenue_task, created_at, data_month")
    .eq("id", monthlyReportId)
    .single();

  let csvQuery = supabase
    .from("csv_data")
    .select("id, creator_id, creator_nickname, handle, group, creator_network_manager, data_month, diamonds, estimated_bonus, valid_days, live_duration, total_reward_jpy, agency_reward_jpy, liver_id, bonus_rookie_half_milestone, bonus_rookie_milestone_1, bonus_rookie_retention, bonus_rookie_milestone_2, bonus_activeness, bonus_off_platform, bonus_revenue_scale")
    .eq("monthly_report_id", monthlyReportId);

  if (agencyId) {
    csvQuery = csvQuery.eq("agency_id", agencyId);
  }

  let refundQuery = supabase
    .from("refunds")
    .select("id, target_month, reason, amount_usd, amount_jpy, liver_id")
    .eq("monthly_report_id", monthlyReportId)
    .eq("is_deleted", false);

  if (agencyId) {
    refundQuery = refundQuery.eq("agency_id", agencyId);
  }

  const [
    { data: report, error: reportError },
    { data: csvRows, error: csvError },
    { data: refunds, error: refundError },
  ] = await Promise.all([reportQuery, csvQuery, refundQuery]);

  if (reportError || !report) {
    if (reportError) console.error("[getDashboardData] report:", reportError.message);
    return { error: "月次レポートが見つかりません" };
  }

  if (csvError) {
    console.error("[getDashboardData] csv:", csvError.message);
    return { error: "CSVデータの取得に失敗しました" };
  }

  if (refundError) {
    console.error("[getDashboardData] refund:", refundError.message);
    return { error: "返金データの取得に失敗しました" };
  }

  const rows = csvRows ?? [];
  const refundRows = refunds ?? [];

  // Compute summary
  const totalDiamonds = rows.reduce((sum, r) => sum + r.diamonds, 0);
  const totalBonus = rows.reduce((sum, r) => sum + r.estimated_bonus, 0);
  const totalRewardJpy = rows.reduce((sum, r) => sum + r.total_reward_jpy, 0);
  const totalAgencyRewardJpy = rows.reduce(
    (sum, r) => sum + r.agency_reward_jpy,
    0
  );
  const totalRefundJpy = refundRows.reduce(
    (sum, r) => sum + r.amount_jpy,
    0
  );

  // Derive a representative commission rate from the rows
  // If there are agency reward rows, calculate the effective commission rate
  const commissionRate =
    totalRewardJpy > 0 ? totalAgencyRewardJpy / totalRewardJpy : 0;

  const netAmountExTax = totalRewardJpy - totalRefundJpy;
  const netAmountIncTax = netAmountExTax * TAX_MULTIPLIER;
  const agencyPaymentIncTax = totalAgencyRewardJpy * TAX_MULTIPLIER;

  const summary: DashboardSummary = {
    totalDiamonds,
    totalBonus,
    totalRewardJpy,
    totalAgencyRewardJpy,
    totalRefundJpy,
    taxRate: TAX_MULTIPLIER,
    netAmountExTax,
    netAmountIncTax,
    agencyPaymentIncTax,
    commissionRate,
  };

  return {
    report,
    csvRows: rows,
    refunds: refundRows,
    summary,
  };
}

// ---------------------------------------------------------------------------
// 3. importCsvData
// ---------------------------------------------------------------------------

export type ImportResult = {
  success: true;
  monthlyReportId: string;
  totalRows: number;
  linkedLiverCount: number;
  unlinkedLiverCount: number;
  linkedAgencyCount: number;
  unlinkedAgencyCount: number;
};

export type ImportConfirmation = {
  needsConfirmation: true;
  existingReports: { id: string; createdAt: string }[];
  dataMonth: string;
};

// CSV行をパース（サーバーサイド）
// TikTokエクスポートのヘッダー名はケースやサフィックスが不定のため、
// 小文字正規化 + 部分一致で柔軟にマッチする
function parseCsvText(csvText: string): CsvRow[] | { error: string } {
  // BOM（Byte Order Mark）を除去
  const cleanText = csvText.replace(/^\uFEFF/, "");

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: true,
  });

  // 致命的エラーのみチェック（FieldMismatch は無視 — 末尾空カラム等で発生しうる）
  const fatalErrors = parsed.errors.filter((e) => e.type !== "FieldMismatch");
  if (fatalErrors.length > 0) {
    return { error: `CSVの解析に失敗しました: ${fatalErrors[0]?.message}` };
  }

  if (parsed.data.length === 0) {
    return { error: "CSVにデータがありません" };
  }

  // ヘッダーキーを小文字正規化して検索
  const firstRow = parsed.data[0];
  const headerKeys = Object.keys(firstRow);
  const lowerKeys = headerKeys.map((k) => k.toLowerCase());

  const hasCreatorId = lowerKeys.some(
    (k) => k === "creator id" || k === "creator_id"
  );
  const hasEstimatedBonus = lowerKeys.some(
    (k) => k.includes("estimated bonus") || k === "estimated_bonus"
  );
  if (!hasCreatorId || !hasEstimatedBonus) {
    return { error: "CSVに必須カラムが不足しています（Creator ID, Estimated Bonus が必要です）" };
  }

  // 小文字キー → 元キーのマッピング
  const keyMap = new Map<string, string>();
  for (const key of headerKeys) {
    keyMap.set(key.toLowerCase(), key);
  }

  // 完全一致（小文字）でフィールドを取得
  function get(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
      const orig = keyMap.get(c.toLowerCase());
      if (orig && row[orig] !== undefined) return row[orig];
    }
    return "";
  }

  // 部分一致（小文字）でフィールドを取得（ボーナス系カラム用）
  function getByPartial(row: Record<string, string>, ...fragments: string[]): string {
    for (const frag of fragments) {
      const lower = frag.toLowerCase();
      for (const [lk, origKey] of keyMap) {
        if (lk.includes(lower) && row[origKey] !== undefined) return row[origKey];
      }
    }
    return "0";
  }

  const safeFloat = (v: string) => {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  };

  const safeBool = (v: string) => {
    const lower = v.toLowerCase().trim();
    return lower === "true" || lower === "yes";
  };

  return parsed.data.map((row) => ({
    creator_id: get(row, "Creator ID", "creator_id"),
    creator_nickname: get(row, "Creator nickname", "Creator Nickname", "creator_nickname"),
    handle: get(row, "Handle", "handle"),
    group: get(row, "Group", "group"),
    group_manager: get(row, "Group manager", "Group Manager", "group_manager"),
    creator_network_manager: get(row, "Creator Network manager", "Creator Network Manager", "creator_network_manager"),
    data_month: get(row, "Data Month", "data_month"),
    diamonds: safeFloat(get(row, "Diamonds", "diamonds") || "0"),
    estimated_bonus: safeFloat(get(row, "Estimated bonus", "Estimated Bonus", "estimated_bonus") || "0"),
    valid_days: get(row, "Valid days(d)", "Valid Days", "valid_days"),
    live_duration: get(row, "LIVE duration(h)", "Live Duration", "live_duration"),
    is_violative_creators: safeBool(
      get(row, "Is violative creators", "Is Violative Creators", "is_violative_creators") || "false"
    ),
    the_creator_was_rookie_at_the_time_of_first_joining: safeBool(
      get(row, "The creator was Rookie at the time of first joining", "The Creator Was Rookie At The Time Of First Joining", "the_creator_was_rookie_at_the_time_of_first_joining") || "false"
    ),
    bonus_rookie_half_milestone: safeFloat(
      getByPartial(row, "rookie half-milestone", "Rookie Half Milestone", "bonus_rookie_half_milestone")
    ),
    bonus_activeness: safeFloat(
      getByPartial(row, "activeness", "bonus_activeness")
    ),
    bonus_revenue_scale: safeFloat(
      getByPartial(row, "revenue scale", "Revenue Scale", "bonus_revenue_scale")
    ),
    bonus_rookie_milestone_1: safeFloat(
      getByPartial(row, "rookie milestone 1 bonus task", "bonus_rookie_milestone_1")
    ),
    bonus_rookie_milestone_2: safeFloat(
      getByPartial(row, "rookie milestone 2", "bonus_rookie_milestone_2")
    ),
    bonus_off_platform: safeFloat(
      getByPartial(row, "off-platform", "bonus_off_platform")
    ),
    bonus_rookie_retention: safeFloat(
      getByPartial(row, "milestone 1 retention", "bonus_rookie_retention")
    ),
  }));
}

export async function importCsvData(params: {
  csvText: string;
  rate: number;
  revenueTask: RevenueTask;
  uploadAgencyId: string;
  replaceReportIds?: string[];
}): Promise<ImportResult | ImportConfirmation | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const { csvText, rate, revenueTask, uploadAgencyId, replaceReportIds } = params;

  // H3: csvText サイズ制限（5MB）
  if (csvText.length > 5_000_000) return { error: "CSVファイルが大きすぎます（上限5MB）" };

  if (rate < 50 || rate > 500) return { error: "為替レートは50〜500の範囲で入力してください" };

  // H2: revenueTask のバリデーション
  const parsedTask = revenueTaskSchema.safeParse(revenueTask);
  if (!parsedTask.success) return { error: "無効な収益タスク区分です" };

  // UUID形式の検証
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uploadAgencyId && !uuidRegex.test(uploadAgencyId)) {
    return { error: "無効な代理店IDです" };
  }

  // サーバーサイドでCSV解析
  const parseResult = parseCsvText(csvText);
  if ("error" in parseResult) return parseResult;
  const rows = parseResult;

  if (rows.length > 10000) return { error: "CSVデータが多すぎます（上限10,000行）" };

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // replaceReportIdsのUUID形式検証
  if (replaceReportIds && replaceReportIds.length > 0) {
    const invalidIds = replaceReportIds.filter((id) => !uuidRegex.test(id));
    if (invalidIds.length > 0) {
      return { error: "無効なレポートIDが含まれています" };
    }
  }

  // 同月のレポートが既に存在するか検知
  const dataMonth = rows[0]?.data_month || null;
  if (dataMonth) {
    const { data: existingReports } = await adminSupabase
      .from("monthly_reports")
      .select("id, created_at")
      .eq("data_month", dataMonth);

    if (existingReports && existingReports.length > 0) {
      // 上書き確認がまだの場合 → クライアントに確認を求める
      if (!replaceReportIds || replaceReportIds.length === 0) {
        return {
          needsConfirmation: true,
          existingReports: existingReports.map((r) => ({
            id: r.id,
            createdAt: r.created_at,
          })),
          dataMonth,
        };
      }

    }
  }

  // 1. monthly_report 作成
  const { data: report, error: reportError } = await supabase
    .from("monthly_reports")
    .insert({
      rate,
      revenue_task: revenueTask,
      data_month: dataMonth,
    })
    .select()
    .single();

  if (reportError || !report) {
    return {
      error: reportError?.message ?? "月次レポートの作成に失敗しました",
    };
  }

  // 旧レポートの置換処理（replaceReportIds が指定されている場合）
  if (replaceReportIds && replaceReportIds.length > 0) {
    // 返金データを新レポートに移行
    const { error: refundMigrateError } = await adminSupabase
      .from("refunds")
      .update({ monthly_report_id: report.id })
      .in("monthly_report_id", replaceReportIds);

    if (refundMigrateError) {
      // 新レポートをロールバック
      await adminSupabase.from("monthly_reports").delete().eq("id", report.id);
      return { error: `返金データの移行に失敗しました: ${refundMigrateError.message}` };
    }

    // 旧csv_dataを削除
    const { error: csvDeleteError } = await adminSupabase
      .from("csv_data")
      .delete()
      .in("monthly_report_id", replaceReportIds);

    if (csvDeleteError) {
      await adminSupabase.from("monthly_reports").delete().eq("id", report.id);
      return { error: `旧CSVデータの削除に失敗しました: ${csvDeleteError.message}` };
    }

    // 旧monthly_reportsを削除
    const { error: reportDeleteError } = await adminSupabase
      .from("monthly_reports")
      .delete()
      .in("id", replaceReportIds);

    if (reportDeleteError) {
      return { error: `旧レポートの削除に失敗しました: ${reportDeleteError.message}` };
    }
  }

  // 2. ライバーと代理店を並列取得（RLSバイパスで全レコード参照）
  const [{ data: allLivers }, { data: allAgencies }] = await Promise.all([
    adminSupabase.from("livers").select("id, liver_id, tiktok_username, agency_id"),
    adminSupabase.from("agencies").select("id, name, commission_rate"),
  ]);

  // Handle（tiktok_username）でマッチ — 大文字小文字を無視して比較
  const liverMap = new Map(
    (allLivers ?? [])
      .filter((l) => l.tiktok_username !== null)
      .map((l) => [l.tiktok_username!.toLowerCase(), l])
  );

  const agencyByNameMap = new Map(
    (allAgencies ?? []).map((a) => [a.name, a])
  );

  // 3. Build csv_data insert rows
  const insertRows = rows.map((row) => {
    const liver = row.handle ? liverMap.get(row.handle.toLowerCase()) : undefined;
    const agency = agencyByNameMap.get(row.creator_network_manager);

    const totalRewardJpy = row.estimated_bonus * rate;
    const agencyCommissionRate = agency?.commission_rate ?? 0;
    const agencyRewardJpy = row.estimated_bonus * rate * agencyCommissionRate;

    return {
      creator_id: row.creator_id,
      creator_nickname: row.creator_nickname,
      handle: row.handle,
      group: row.group,
      group_manager: row.group_manager,
      creator_network_manager: row.creator_network_manager,
      data_month: row.data_month,
      diamonds: row.diamonds,
      estimated_bonus: row.estimated_bonus,
      bonus_rookie_half_milestone: row.bonus_rookie_half_milestone,
      bonus_activeness: row.bonus_activeness,
      bonus_revenue_scale: row.bonus_revenue_scale,
      bonus_rookie_milestone_1: row.bonus_rookie_milestone_1,
      bonus_rookie_milestone_2: row.bonus_rookie_milestone_2,
      bonus_off_platform: row.bonus_off_platform,
      bonus_rookie_retention: row.bonus_rookie_retention,
      valid_days: row.valid_days,
      live_duration: row.live_duration,
      is_violative: row.is_violative_creators,
      was_rookie: row.the_creator_was_rookie_at_the_time_of_first_joining,
      total_reward_jpy: totalRewardJpy,
      agency_reward_jpy: agencyRewardJpy,
      liver_id: liver?.id ?? null,
      agency_id: agency?.id ?? null,
      monthly_report_id: report.id,
      upload_agency_id: uploadAgencyId || null,
    };
  });

  // 4. Count link statistics
  const linkedLiverCount = insertRows.filter((r) => r.liver_id !== null).length;
  const unlinkedLiverCount = insertRows.length - linkedLiverCount;
  const linkedAgencyCount = insertRows.filter((r) => r.agency_id !== null).length;
  const unlinkedAgencyCount = insertRows.length - linkedAgencyCount;

  // 5. Insert csv_data in batches (Supabase has row limits per insert)
  const BATCH_SIZE = 500;
  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from("csv_data")
      .insert(batch);

    if (insertError) {
      // Cleanup: remove partial csv_data and orphaned monthly_report
      // adminSupabase を使用してRLSをバイパス（確実にクリーンアップするため）
      await Promise.all([
        adminSupabase
          .from("csv_data")
          .delete()
          .eq("monthly_report_id", report.id),
        adminSupabase
          .from("monthly_reports")
          .delete()
          .eq("id", report.id),
      ]);
      return { error: insertError.message };
    }
  }

  revalidatePath("/dashboard");
  return {
    success: true,
    monthlyReportId: report.id,
    totalRows: insertRows.length,
    linkedLiverCount,
    unlinkedLiverCount,
    linkedAgencyCount,
    unlinkedAgencyCount,
  };
}

// ---------------------------------------------------------------------------
// 4. createRefund
// ---------------------------------------------------------------------------

export async function createRefund(params: {
  liverId: string;
  targetMonth: string;
  amountUsd: number;
  reason: string;
  monthlyReportId: string;
}): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const parsed = createRefundSchema.safeParse(params);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力値が不正です" };
  }

  const { liverId, targetMonth, amountUsd, reason, monthlyReportId } = parsed.data;
  const supabase = await createClient();

  // report と liver を並列取得
  const [
    { data: report, error: reportError },
    { data: liver, error: liverError },
  ] = await Promise.all([
    supabase
      .from("monthly_reports")
      .select("rate")
      .eq("id", monthlyReportId)
      .single(),
    supabase
      .from("livers")
      .select("agency_id")
      .eq("id", liverId)
      .single(),
  ]);

  if (reportError || !report) {
    return {
      error: reportError?.message ?? "月次レポートが見つかりません",
    };
  }

  if (liverError || !liver) {
    return {
      error: liverError?.message ?? "ライバーが見つかりません",
    };
  }

  const amountJpy = amountUsd * report.rate;

  // Insert refund record
  const { error: insertError } = await supabase.from("refunds").insert({
    liver_id: liverId,
    target_month: targetMonth,
    amount_usd: amountUsd,
    amount_jpy: amountJpy,
    reason,
    agency_id: liver.agency_id,
    monthly_report_id: monthlyReportId,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 5. deleteRefund
// ---------------------------------------------------------------------------

export async function deleteRefund(
  refundId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const supabase = await createClient();

  const { error } = await supabase
    .from("refunds")
    .update({ is_deleted: true })
    .eq("id", refundId);

  if (error) {
    console.error("[deleteRefund]", error.message);
    return { error: "返金の削除に失敗しました" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 6. previewRateChange
// ---------------------------------------------------------------------------

export type RateChangePreview = {
  oldRate: number;
  newRate: number;
  csvRowCount: number;
  refundRowCount: number;
  oldTotalRewardJpy: number;
  newTotalRewardJpy: number;
  oldTotalRefundJpy: number;
  newTotalRefundJpy: number;
};

export async function previewRateChange(
  monthlyReportId: string,
  newRate: number
): Promise<RateChangePreview | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  if (newRate <= 0) return { error: "為替レートは正の数で入力してください" };

  const supabase = await createClient();

  const [reportRes, csvRes, refundRes] = await Promise.all([
    supabase
      .from("monthly_reports")
      .select("rate")
      .eq("id", monthlyReportId)
      .single(),
    supabase
      .from("csv_data")
      .select("estimated_bonus, total_reward_jpy")
      .eq("monthly_report_id", monthlyReportId),
    supabase
      .from("refunds")
      .select("amount_usd, amount_jpy")
      .eq("monthly_report_id", monthlyReportId)
      .eq("is_deleted", false),
  ]);

  if (reportRes.error || !reportRes.data) {
    return { error: "レポートの取得に失敗しました" };
  }

  const oldRate = reportRes.data.rate;
  const csvRows = csvRes.data ?? [];
  const refundRows = refundRes.data ?? [];

  const oldTotalRewardJpy = csvRows.reduce((s, r) => s + r.total_reward_jpy, 0);
  const newTotalRewardJpy = csvRows.reduce(
    (s, r) => s + Math.round(r.estimated_bonus * newRate * 100) / 100,
    0
  );

  const oldTotalRefundJpy = refundRows.reduce((s, r) => s + r.amount_jpy, 0);
  const newTotalRefundJpy = refundRows.reduce(
    (s, r) => s + Math.round(r.amount_usd * newRate * 100) / 100,
    0
  );

  return {
    oldRate,
    newRate,
    csvRowCount: csvRows.length,
    refundRowCount: refundRows.length,
    oldTotalRewardJpy,
    newTotalRewardJpy,
    oldTotalRefundJpy,
    newTotalRefundJpy,
  };
}

// ---------------------------------------------------------------------------
// 7. updateExchangeRate
// ---------------------------------------------------------------------------

export async function updateExchangeRate(
  monthlyReportId: string,
  newRate: number
): Promise<{ success: true; oldRate: number } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  if (newRate <= 0) return { error: "為替レートは正の数で入力してください" };

  const supabase = await createClient();

  // 旧レート・影響件数を取得
  const [reportRes, csvCountRes, refundCountRes] = await Promise.all([
    supabase
      .from("monthly_reports")
      .select("rate")
      .eq("id", monthlyReportId)
      .single(),
    supabase
      .from("csv_data")
      .select("id", { count: "exact", head: true })
      .eq("monthly_report_id", monthlyReportId),
    supabase
      .from("refunds")
      .select("id", { count: "exact", head: true })
      .eq("monthly_report_id", monthlyReportId)
      .eq("is_deleted", false),
  ]);

  if (reportRes.error || !reportRes.data) {
    return { error: "レポートの取得に失敗しました" };
  }

  const oldRate = reportRes.data.rate;

  // RPC実行（再計算）
  const { error } = await supabase.rpc("update_exchange_rate", {
    p_monthly_report_id: monthlyReportId,
    p_new_rate: newRate,
  });

  if (error) {
    console.error("[updateExchangeRate]", error.message);
    return { error: "為替レートの更新に失敗しました" };
  }

  // 変更履歴を保存（RLSバイパス、失敗しても本体は成功済み）
  const adminSupabase = createAdminClient();
  const { error: logError } = await adminSupabase
    .from("rate_change_logs")
    .insert({
      monthly_report_id: monthlyReportId,
      old_rate: oldRate,
      new_rate: newRate,
      affected_csv_rows: csvCountRes.count ?? 0,
      affected_refund_rows: refundCountRes.count ?? 0,
      changed_by: user.id,
    });
  if (logError) {
    console.warn("為替レート変更履歴の保存に失敗:", logError.message);
  }

  revalidatePath("/dashboard");
  return { success: true, oldRate };
}

// ---------------------------------------------------------------------------
// 8. deleteMonthlyReport
// ---------------------------------------------------------------------------

export async function deleteMonthlyReport(
  monthlyReportId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(monthlyReportId)) return { error: "無効なレポートIDです" };

  const adminSupabase = createAdminClient();

  // レポートの存在確認
  const { data: report, error: reportError } = await adminSupabase
    .from("monthly_reports")
    .select("id")
    .eq("id", monthlyReportId)
    .single();

  if (reportError || !report) {
    return { error: "レポートが見つかりません" };
  }

  // 返金 → CSVデータ → レポートの順で削除（FK依存順）
  const { error: refundError } = await adminSupabase
    .from("refunds")
    .delete()
    .eq("monthly_report_id", monthlyReportId);

  if (refundError) {
    return { error: `返金データの削除に失敗しました: ${refundError.message}` };
  }

  const { error: csvError } = await adminSupabase
    .from("csv_data")
    .delete()
    .eq("monthly_report_id", monthlyReportId);

  if (csvError) {
    return { error: `CSVデータの削除に失敗しました: ${csvError.message}` };
  }

  const { error: deleteError } = await adminSupabase
    .from("monthly_reports")
    .delete()
    .eq("id", monthlyReportId);

  if (deleteError) {
    return { error: `レポートの削除に失敗しました: ${deleteError.message}` };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
