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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getInvoicePreview,
  createAndSendInvoice,
  type InvoicePreview,
} from "@/lib/actions/invoices";
import type { MonthlyReportItem } from "@/lib/actions/dashboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: MonthlyReportItem[];
  userAgencyId: string;
};

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  reports,
  userAgencyId,
}: Props) {
  const [selectedReportId, setSelectedReportId] = useState("");
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleReportChange(id: string) {
    setSelectedReportId(id);
    setPreview(null);
    setLoadingPreview(true);
  }

  // Fetch preview when report is selected
  useEffect(() => {
    if (!selectedReportId) return;

    let cancelled = false;
    getInvoicePreview(userAgencyId, selectedReportId)
      .then((result) => {
        if (cancelled) return;
        if ("error" in result) {
          toast.error("プレビュー取得に失敗しました", {
            description: result.error,
          });
          setPreview(null);
        } else {
          setPreview(result);
        }
        setLoadingPreview(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("プレビュー取得に失敗しました");
        setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedReportId, userAgencyId]);

  async function handleSubmit() {
    if (!selectedReportId) return;
    setSubmitting(true);

    const result = await createAndSendInvoice({
      agencyId: userAgencyId,
      monthlyReportId: selectedReportId,
    });

    if ("error" in result) {
      toast.error("請求書の作成に失敗しました", {
        description: result.error,
      });
    } else {
      toast.success("請求書を作成しました");
      if ("emailError" in result && result.emailError) {
        toast.warning("通知メールの送信に失敗しました", {
          description: String(result.emailError),
        });
      }
      onOpenChange(false);
    }

    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>請求書作成</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Monthly Report Select */}
          <div className="space-y-2">
            <Label>月次レポート</Label>
            <Select
              value={selectedReportId}
              onValueChange={handleReportChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="月次レポートを選択" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.data_month ?? "月未設定"} (レート:{" "}
                    {report.rate.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {loadingPreview && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground text-center">
                金額計算中...
              </p>
            </div>
          )}

          {preview && !loadingPreview && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">金額プレビュー</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">代理店名</span>
                  <span>{preview.agencyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">対象月</span>
                  <span>{preview.dataMonth ?? "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">為替レート</span>
                  <span>{preview.exchangeRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">手数料率</span>
                  <span>
                    {(preview.commissionRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">税抜金額</span>
                  <span>
                    {preview.subtotalJpy.toLocaleString("ja-JP")}円
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    消費税（10%）
                  </span>
                  <span>
                    {preview.taxAmountJpy.toLocaleString("ja-JP")}円
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>合計金額（税込）</span>
                  <span>
                    {preview.totalJpy.toLocaleString("ja-JP")}円
                  </span>
                </div>
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    インボイス登録
                  </span>
                  <span
                    className={
                      preview.isInvoiceRegistered
                        ? "text-green-600"
                        : "text-yellow-600"
                    }
                  >
                    {preview.isInvoiceRegistered ? "登録済" : "未登録"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    仕入税額控除割合
                  </span>
                  <span>
                    {(preview.deductibleRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!preview || submitting}
          >
            {submitting ? "送信中..." : "作成して送信"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
