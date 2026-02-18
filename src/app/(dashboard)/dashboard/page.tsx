import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 認証・レポート・代理店・ライバーを全て並列取得
  const [user, reports, { data: agenciesRaw }, { data: liversRaw }] =
    await Promise.all([
      getAuthUser(),
      getMonthlyReports(),
      supabase.from("agencies").select("id, name").order("name"),
      supabase.from("livers").select("id, name").order("name"),
    ]);
  if (!user) redirect("/login");

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
