"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";

/**
 * 指定月の多段分配明細（distributions）を再生成する。
 *
 * 中核は冪等RPC recalculate_distributions（040）。何度呼んでも同じ結果になる。
 * 為替/手数料率/ライバー代理店変更の経路では RPC 内 PERFORM が自動で呼ぶため、
 * この Server Action は **import 直後の明示再計算** と、管理画面からの手動再計算に使う。
 *
 * ⚠️ 必ず user セッションの client（createClient）で呼ぶこと。
 *    RPC内の admin ガードは `profiles WHERE id = auth.uid()` を見るが、service_role 経由だと
 *    auth.uid()=NULL → 照会が NULL を返し `NULL != 'system_admin'` も NULL(=偽) で **素通りする**
 *    （029/031 既存RPCと同じ挙動）。よって権限担保は下の TS 層ガード＋ user セッション利用に依存する。
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
  return { success: true };
}
