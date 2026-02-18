import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./_components/dashboard-client";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const reports = await getMonthlyReports();

  const { data: agenciesRaw } = await supabase
    .from("agencies")
    .select("id, name")
    .order("name");

  const { data: liversRaw } = await supabase
    .from("livers")
    .select("id, name")
    .order("name");

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
