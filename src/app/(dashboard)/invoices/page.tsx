import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getInvoices } from "@/lib/actions/invoices";
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

  const [invoices, reports] = await Promise.all([
    getInvoices(),
    getMonthlyReports(),
  ]);

  return (
    <div className="space-y-6">
      <InvoicesClient
        invoices={invoices}
        reports={reports}
        userRole={user.role}
        userAgencyId={user.agencyId}
      />
    </div>
  );
}
