"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getInvoiceDetail, type InvoiceDetail } from "@/lib/actions/invoices";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import type { AccountType } from "@/lib/supabase/types";

function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return "*".repeat(num.length - 4) + num.slice(-4);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
};

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoiceId,
}: Props) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getInvoiceDetail(invoiceId)
      .then((result) => {
        if ("error" in result) {
          toast.error("請求書の取得に失敗しました", {
            description: result.error,
          });
          setInvoice(null);
        } else {
          setInvoice(result);
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("請求書の取得に失敗しました");
        setLoading(false);
      });
  }, [open, invoiceId]);

  async function handleDownloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!res.ok) {
        throw new Error("PDF生成に失敗しました");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoice_number ?? "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("PDFのダウンロードに失敗しました");
    }
    setDownloading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>請求書詳細</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : invoice ? (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">請求書番号</span>
                <span className="font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">代理店名</span>
                <span>{invoice.agency_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">対象月</span>
                <span>{invoice.data_month ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">送付日</span>
                <span>
                  {invoice.sent_at
                    ? new Date(invoice.sent_at).toLocaleDateString("ja-JP")
                    : "未送信"}
                </span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Amount Details */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">為替レート</span>
                <span>{invoice.exchange_rate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">手数料率</span>
                <span>
                  {(invoice.commission_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">税抜金額</span>
                <span>
                  {invoice.subtotal_jpy.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  消費税（{(invoice.tax_rate * 100).toFixed(0)}%）
                </span>
                <span>
                  {invoice.tax_amount_jpy.toLocaleString("ja-JP")}円
                </span>
              </div>
              <div className="flex justify-between font-medium text-base">
                <span>合計金額（税込）</span>
                <span>{invoice.total_jpy.toLocaleString("ja-JP")}円</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Invoice Registration */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  インボイス登録
                </span>
                <span
                  className={
                    invoice.is_invoice_registered
                      ? "text-green-600"
                      : "text-yellow-600"
                  }
                >
                  {invoice.is_invoice_registered ? "登録済" : "未登録"}
                </span>
              </div>
              {invoice.invoice_registration_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">登録番号</span>
                  <span className="font-mono">
                    {invoice.invoice_registration_number}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  仕入税額控除割合
                </span>
                <span>
                  {(invoice.deductible_rate * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Bank Info */}
            {invoice.bank_name && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">振込先口座</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">銀行名</span>
                    <span>{invoice.bank_name}</span>
                  </div>
                  {invoice.bank_branch && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">支店名</span>
                      <span>{invoice.bank_branch}</span>
                    </div>
                  )}
                  {invoice.bank_account_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">口座種別</span>
                      <span>
                        {ACCOUNT_TYPE_LABELS[
                          invoice.bank_account_type as AccountType
                        ] ?? invoice.bank_account_type}
                      </span>
                    </div>
                  )}
                  {invoice.bank_account_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">口座番号</span>
                      <span>{maskAccountNumber(invoice.bank_account_number)}</span>
                    </div>
                  )}
                  {invoice.bank_account_holder && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">口座名義</span>
                      <span>{invoice.bank_account_holder}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            請求書が見つかりませんでした
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            閉じる
          </Button>
          {invoice && (
            <Button onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="size-4" />
              {downloading ? "生成中..." : "PDFダウンロード"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
