import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getInvoices } from "@/lib/actions/invoices";
import { getMonthlyReports } from "@/lib/actions/dashboard";
import { getAgencies } from "@/lib/actions/agencies";
import { InvoicesClient } from "./_components/invoices-client";

export default async function InvoicesPage() {
  const [user, invoices, reports, agencies] = await Promise.all([
    getAuthUser(),
    getInvoices(),
    getMonthlyReports(),
    getAgencies(),
  ]);

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <InvoicesClient
        invoices={invoices}
        reports={reports}
        agencies={agencies}
        userRole={user.role}
        userAgencyId={user.agencyId}
      />
    </div>
  );
}
