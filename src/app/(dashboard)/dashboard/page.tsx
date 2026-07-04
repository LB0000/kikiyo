import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  // ロール判定を先に行い、対象外ロールでは無駄なデータ取得を避ける（早期リダイレクト）。
  // 4-D フル: マネージャーは担当代理店の生データ閲覧可（RLSスコープ・内部列マスク）。
  // スカウトは分配明細のみ＝/distributions へ。
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.role === "scout_user") redirect("/distributions");

  const supabase = await createClient();
  const [reports, { data: agenciesRaw }, { data: liversRaw }] = await Promise.all([
    getMonthlyReports(),
    supabase.from("agencies").select("id, name").eq("is_deleted", false).order("name"),
    supabase.from("livers").select("id, name, account_name, tiktok_username, liver_id, agency_id").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <DashboardClient
        reports={reports}
        agencies={agenciesRaw ?? []}
        livers={liversRaw ?? []}
        userAgencyId={user.agencyId}
        isAdmin={user.role === "system_admin"}
      />
    </div>
  );
}
