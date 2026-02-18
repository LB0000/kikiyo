"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { InvoicesTable } from "./invoices-table";
import { CreateInvoiceDialog } from "./create-invoice-dialog";
import { InvoiceDetailDialog } from "./invoice-detail-dialog";
import type { InvoiceListItem } from "@/lib/actions/invoices";
import type { MonthlyReportItem } from "@/lib/actions/dashboard";
import type { AgencyWithHierarchy } from "@/lib/actions/agencies";
import type { UserRole } from "@/lib/supabase/types";

type Props = {
  invoices: InvoiceListItem[];
  reports: MonthlyReportItem[];
  agencies: AgencyWithHierarchy[];
  userRole: UserRole;
  userAgencyId: string | null;
};

export function InvoicesClient({
  invoices,
  reports,
  agencies,
  userRole,
  userAgencyId,
}: Props) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKey, setDetailKey] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );

  function handleCreate() {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  }

  function handleDetail(invoiceId: string) {
    setSelectedInvoiceId(invoiceId);
    setDetailKey((k) => k + 1);
    setDetailOpen(true);
  }

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.agency_name.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          請求書一覧
        </h1>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          月次レポートに基づく請求書の管理
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="代理店名・請求書番号で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80 pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length}件
          </span>
        </div>
        <Button className="rounded-full" onClick={handleCreate}>
          請求書作成
        </Button>
      </div>

      <InvoicesTable
        key={search}
        invoices={filtered}
        onDetail={handleDetail}
      />

      <CreateInvoiceDialog
        key={createKey}
        open={createOpen}
        onOpenChange={setCreateOpen}
        reports={reports}
        agencies={agencies}
        userRole={userRole}
        userAgencyId={userAgencyId}
      />

      {selectedInvoiceId && (
        <InvoiceDetailDialog
          key={detailKey}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          invoiceId={selectedInvoiceId}
        />
      )}
    </>
  );
}
