import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getInvoices, getIssuableAgencies } from "@/lib/actions/invoices";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { fallbackPathForRole } from "@/lib/constants";
import { InvoicesClient } from "./_components/invoices-client";

export default async function InvoicesPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  // 請求書は admin / 代理店ユーザーのみ（manager/scout は不可）。
  if (user.role !== "system_admin" && user.role !== "agency_user") {
    redirect(fallbackPathForRole(user.role));
  }

  const [invoices, reports, issuableAgencies] = await Promise.all([
    getInvoices(),
    getMonthlyReports(),
    // 発行可能な代理店（＝閲覧可能代理店）。複数社ある場合は作成時に選択させる。
    getIssuableAgencies(),
  ]);

  return (
    <div className="space-y-6">
      <InvoicesClient
        invoices={invoices}
        reports={reports}
        userRole={user.role}
        userAgencyId={user.agencyId}
        issuableAgencies={issuableAgencies}
      />
    </div>
  );
}
