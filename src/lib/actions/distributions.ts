"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import type { PayeeKind } from "@/lib/supabase/types";

/** 分配明細の画面表示用1行（payee名を解決済み）。 */
export type DistributionListItem = {
  id: string;
  monthly_report_id: string;
  payee_kind: PayeeKind;
  /** 分配先の表示名（マネージャー/スカウト/三次代理店名、total_side は固定ラベル）。 */
  payee_name: string;
  /** 分配元代理店名（RLSで読めない場合は null）。 */
  source_agency_name: string | null;
  base_amount_jpy: number;
  applied_rate: number;
  amount_jpy: number;
  /** インボイス未登録の分配先への2%控除額（amount_jpy は控除後）。 */
  royalty_deduction_jpy: number;
  tier: number;
};

type EmbeddedName = { name: string } | null;

/**
 * 指定月の分配明細を取得する（画面表示用）。
 *
 * 行スコープは RLS（037）が担保する:
 *   - system_admin: 全 source の全明細（total_side 含む）
 *   - manager_user: 自分の担当代理店が source の明細のみ（total_side は admin 限定で見えない）
 *   - scout_user:   自分宛の scout 明細のみ
 * payee 名の解決は PostgREST 埋め込みで行い、RLS で読めない参照は null になる
 * （例: scout は agencies を読めないため source 名が null）。
 */
export async function getDistributions(
  monthlyReportId: string
): Promise<DistributionListItem[]> {
  const user = await getAuthUser();
  if (!user) return [];
  // 分配明細を見るのは admin / マネージャー / スカウトのみ（代理店ユーザーは請求書側）。
  const ALLOWED: ReadonlyArray<typeof user.role> = [
    "system_admin",
    "manager_user",
    "scout_user",
  ];
  if (!ALLOWED.includes(user.role)) return [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!monthlyReportId || !uuidRegex.test(monthlyReportId)) return [];

  const supabase = await createClient();

  let query = supabase
    .from("distributions")
    .select(
      "id, monthly_report_id, payee_kind, base_amount_jpy, applied_rate, amount_jpy, royalty_deduction_jpy, tier, " +
        "source:agencies!source_agency_id(name), manager:managers(name), " +
        "scout:scouts(name), payee:agencies!payee_agency_id(name)"
    )
    .eq("monthly_report_id", monthlyReportId);

  // 多層防御: total_side（発注元マージン）は admin のみ。RLS(037)でも遮断するが二重に絞る。
  if (user.role !== "system_admin") {
    query = query.neq("payee_kind", "total_side");
  }

  const { data, error } = await query.order("tier", { ascending: true });

  if (error || !data) {
    if (error) console.error("[getDistributions]", error.message);
    return [];
  }

  return data.map((row) => {
    const r = row as unknown as {
      id: string;
      monthly_report_id: string;
      payee_kind: PayeeKind;
      base_amount_jpy: number;
      applied_rate: number;
      amount_jpy: number;
      royalty_deduction_jpy: number;
      tier: number;
      source: EmbeddedName;
      manager: EmbeddedName;
      scout: EmbeddedName;
      payee: EmbeddedName;
    };
    const payeeName =
      r.payee_kind === "manager"
        ? (r.manager?.name ?? "（マネージャー）")
        : r.payee_kind === "scout"
          ? (r.scout?.name ?? "（スカウト）")
          : r.payee_kind === "agency"
            ? (r.payee?.name ?? "（三次代理店）")
            : "トータルサイド";
    return {
      id: r.id,
      monthly_report_id: r.monthly_report_id,
      payee_kind: r.payee_kind,
      payee_name: payeeName,
      source_agency_name: r.source?.name ?? null,
      base_amount_jpy: r.base_amount_jpy,
      applied_rate: r.applied_rate,
      amount_jpy: r.amount_jpy,
      royalty_deduction_jpy: r.royalty_deduction_jpy,
      tier: r.tier,
    };
  });
}

/**
 * 指定月の多段分配明細（distributions）を再生成する。
 *
 * 中核は冪等RPC recalculate_distributions（040）。何度呼んでも同じ結果になる。
 * 為替/手数料率/ライバー代理店変更の経路では RPC 内 PERFORM が自動で呼ぶため、
 * この Server Action は **import 直後の明示再計算** と、管理画面からの手動再計算に使う。
 *
 * ⚠️ 必ず user セッションの client（createClient）で呼ぶこと。RPC内の admin ガードは
 *    `IS DISTINCT FROM 'system_admin'`（040）で、service_role（auth.uid()=NULL）は拒否される。
 *    user セッションでないと admin でも auth.uid() が取れず弾かれるため createClient が必須。
 */
export async function recalculateDistributions(
  monthlyReportId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "認証が必要です" };
  if (user.role !== "system_admin") return { error: "権限がありません" };

  if (!monthlyReportId) return { error: "月次レポートIDが必要です" };

  const supabase = await createClient();

  const { error } = await supabase.rpc("recalculate_distributions", {
    p_monthly_report_id: monthlyReportId,
  });

  if (error) {
    console.error("[recalculateDistributions]", error.message);
    return { error: "分配明細の再計算に失敗しました" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/distributions");
  return { success: true };
}
