import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { getDistributions } from "@/lib/actions/distributions";
import { DistributionsClient } from "./_components/distributions-client";

export default async function DistributionsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  // 代理店ユーザーは分配明細の対象外（請求書側）。
  if (user.role === "agency_user") redirect("/invoices");

  const reports = await getMonthlyReports();
  const initialReportId = reports[0]?.id ?? null;
  const initialRows = initialReportId
    ? await getDistributions(initialReportId)
    : [];

  return (
    <div className="space-y-6">
      <DistributionsClient
        reports={reports}
        userRole={user.role}
        initialReportId={initialReportId}
        initialRows={initialRows}
      />
    </div>
  );
}
