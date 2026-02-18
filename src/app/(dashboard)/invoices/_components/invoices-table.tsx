"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Eye } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import type { InvoiceListItem } from "@/lib/actions/invoices";

type Props = {
  invoices: InvoiceListItem[];
  onDetail: (invoiceId: string) => void;
};

const PAGE_SIZE = 10;

export function InvoicesTable({ invoices, onDetail }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedInvoices = invoices.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>請求書番号</TableHead>
              <TableHead>代理店名</TableHead>
              <TableHead>対象月</TableHead>
              <TableHead className="text-right">税抜金額</TableHead>
              <TableHead className="text-right">税込金額</TableHead>
              <TableHead>インボイス</TableHead>
              <TableHead>送付日</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="p-0">
                  <EmptyState
                    icon={Receipt}
                    title="請求書がありません"
                    description="月次レポートから請求書を作成してください"
                  />
                </TableCell>
              </TableRow>
            ) : (
              pagedInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">
                    {inv.invoice_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {inv.agency_name}
                  </TableCell>
                  <TableCell>{inv.data_month ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {inv.subtotal_jpy.toLocaleString("ja-JP")}円
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {inv.total_jpy.toLocaleString("ja-JP")}円
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        inv.is_invoice_registered
                          ? "inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700"
                      }
                    >
                      {inv.is_invoice_registered ? "登録済" : "未登録"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {inv.sent_at
                      ? new Date(inv.sent_at).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="cursor-pointer p-2.5 -m-1.5 text-primary hover:text-primary/70 transition-colors"
                      onClick={() => onDetail(inv.id)}
                      aria-label="詳細"
                    >
                      <Eye className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
