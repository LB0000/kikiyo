"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryCards } from "./summary-cards";
import { CsvUploadDialog } from "./csv-upload-dialog";
import { DataTable } from "./data-table";
import { RefundTable } from "./refund-table";
import { RefundFormDialog } from "./refund-form-dialog";
import { ExchangeRateDialog } from "./exchange-rate-dialog";
import {
  getDashboardData,
  deleteMonthlyReport,
  type MonthlyReportItem,
  type DashboardData,
} from "@/lib/actions/dashboard";
import { REVENUE_TASK_LABELS } from "@/lib/constants";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Upload, Trash2 } from "lucide-react";
import type { RevenueTask } from "@/lib/supabase/types";

type Props = {
  reports: MonthlyReportItem[];
  agencies: { id: string; name: string }[];
  livers: { id: string; name: string | null }[];
  userAgencyId: string | null;
  isAdmin: boolean;
};

export function DashboardClient({
  reports,
  agencies,
  livers,
  userAgencyId,
  isAdmin,
}: Props) {
  const [selectedReportId, setSelectedReportId] = useState(
    reports[0]?.id ?? ""
  );
  const [filterMode, setFilterMode] = useState<"all" | "agency">("all");
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // ダイアログ制御
  const [csvOpen, setCsvOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [csvKey, setCsvKey] = useState(0);
  const [refundKey, setRefundKey] = useState(0);
  const [rateKey, setRateKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const agencyFilter = useMemo(
    () =>
      filterMode === "agency" && selectedAgencyId
        ? selectedAgencyId
        : undefined,
    [filterMode, selectedAgencyId]
  );

  useEffect(() => {
    if (!selectedReportId) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const result = await getDashboardData(selectedReportId, agencyFilter);
        if (cancelled) return;
        if ("error" in result) {
          setDashboardData(null);
          toast.error("データの取得に失敗しました", { description: result.error });
        } else {
          setDashboardData(result);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[DashboardClient] fetchData error:", err);
          setDashboardData(null);
          toast.error("データの取得中にエラーが発生しました", {
            description: msg,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedReportId, agencyFilter, refreshKey]);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  function formatDataMonth(dataMonth: string | null, createdAt: string): string {
    if (dataMonth) {
      // "202511" → "2025/11"
      if (/^\d{6}$/.test(dataMonth)) {
        return `${dataMonth.slice(0, 4)}/${dataMonth.slice(4)}`;
      }
      // "2025-11" → "2025/11"
      if (/^\d{4}-\d{2}$/.test(dataMonth)) {
        return dataMonth.replace("-", "/");
      }
      return dataMonth;
    }
    return new Date(createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit" });
  }

  async function handleDeleteReport() {
    if (!selectedReportId) return;
    setDeleting(true);
    try {
      const result = await deleteMonthlyReport(selectedReportId);
      if ("error" in result) {
        toast.error("削除に失敗しました", { description: result.error });
      } else {
        toast.success("レポートを削除しました");
        // 次のレポートを選択（削除したもの以外の先頭）
        const remaining = reports.filter((r) => r.id !== selectedReportId);
        setSelectedReportId(remaining[0]?.id ?? "");
        setDashboardData(null);
      }
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  const outlineActionClass = "rounded-full border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40";

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
          <span className="inline-block h-7 w-1 rounded-full bg-gradient-to-b from-primary to-primary/60" />
          オールインTikTokバックエンド
        </h1>
        <p className="mt-1.5 pl-7 text-sm text-muted-foreground/70">
          月次レポートとデータの確認・管理
        </p>
      </div>

      {/* フィルター・アクション行 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">表示期間</span>
            <Select
              value={selectedReportId}
              onValueChange={setSelectedReportId}
            >
              <SelectTrigger className="w-48" aria-label="月次レポートを選択">
                <SelectValue placeholder="レポートを選択" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {formatDataMonth(r.data_month, r.created_at)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && selectedReportId && (
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={deleting}
                aria-label="レポートを削除"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-4">
              <RadioGroup
                value={filterMode}
                onValueChange={(v) => setFilterMode(v as "all" | "agency")}
                className="flex items-center gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="all" id="filter-all" />
                  <Label htmlFor="filter-all" className="text-sm font-normal cursor-pointer">
                    全表示
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="agency" id="filter-agency" />
                  <Label htmlFor="filter-agency" className="text-sm font-normal cursor-pointer">
                    代理店指定
                  </Label>
                </div>
              </RadioGroup>
              {filterMode === "agency" && (
                <Select
                  value={selectedAgencyId}
                  onValueChange={setSelectedAgencyId}
                >
                  <SelectTrigger className="w-48" aria-label="代理店を選択">
                    <SelectValue placeholder="代理店を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {agencies.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-3">
            {selectedReportId && dashboardData && (
              <>
                <Button variant="outline" className={outlineActionClass} onClick={() => { setRateKey((k) => k + 1); setRateOpen(true); }}>
                  為替レート変更
                </Button>
                <Button variant="outline" className={outlineActionClass} onClick={() => { setRefundKey((k) => k + 1); setRefundOpen(true); }}>
                  返金登録
                </Button>
              </>
            )}
            <Button className="rounded-full shadow-sm" onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}>
              CSV登録
            </Button>
          </div>
        )}
      </div>

      {/* サマリーカード */}
      {loading ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 shadow-[var(--card-shadow)]">
              <div className="flex items-center gap-3">
                <div className="size-9 animate-shimmer rounded-lg" />
                <div className="h-3 w-20 animate-shimmer rounded" />
              </div>
              <div className="mt-5 ml-auto h-7 w-28 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : dashboardData ? (
        <SummaryCards
          revenueTask={
            selectedReport?.revenue_task
              ? REVENUE_TASK_LABELS[
                  selectedReport.revenue_task as RevenueTask
                ]
              : null
          }
          exchangeRate={dashboardData.report.rate}
          totalDiamonds={dashboardData.summary.totalDiamonds}
          totalBonus={dashboardData.summary.totalBonus}
          netAmountExTax={dashboardData.summary.netAmountExTax}
          netAmountIncTax={dashboardData.summary.netAmountIncTax}
          commissionRate={dashboardData.summary.commissionRate}
          agencyPaymentIncTax={dashboardData.summary.agencyPaymentIncTax}
        />
      ) : null}

      {/* データ/返金タブ */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-shimmer rounded-lg" />
            <div className="h-9 w-28 animate-shimmer rounded-lg" />
          </div>
          <div className="overflow-hidden rounded-xl border">
            <div className="h-11 animate-shimmer" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[46px] animate-shimmer border-t border-border/40" />
            ))}
          </div>
        </div>
      ) : dashboardData ? (
        <Tabs defaultValue="data">
          <TabsList variant="line">
            <TabsTrigger value="data">データ一覧</TabsTrigger>
            <TabsTrigger value="refund">返金一覧</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="mt-4">
            <DataTable key={`${selectedReportId}-${agencyFilter ?? "all"}`} rows={dashboardData.csvRows} livers={livers} />
          </TabsContent>
          <TabsContent value="refund" className="mt-4">
            <RefundTable
              key={`${selectedReportId}-${agencyFilter ?? "all"}`}
              rows={dashboardData.refunds.map((r) => ({
                id: r.id,
                liver_name:
                  livers.find((l) => l.id === r.liver_id)?.name ?? null,
                target_month: r.target_month,
                amount_usd: r.amount_usd,
                amount_jpy: r.amount_jpy,
                reason: r.reason,
              }))}
            />
          </TabsContent>
        </Tabs>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/50">
            <Upload className="size-7 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground/80">まだデータがありません</p>
            <p className="mt-1.5 text-xs text-muted-foreground/70">
              CSVファイルをアップロードしてダッシュボードを開始しましょう
            </p>
          </div>
          {isAdmin && (
            <Button className="rounded-full" onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}>
              CSVをアップロード
            </Button>
          )}
        </div>
      ) : null}

      {/* ダイアログ群 */}
      <CsvUploadDialog
        key={csvKey}
        open={csvOpen}
        onOpenChange={setCsvOpen}
        uploadAgencyId={userAgencyId}
      />

      {selectedReportId && dashboardData && (
        <>
          <RefundFormDialog
            key={refundKey}
            open={refundOpen}
            onOpenChange={setRefundOpen}
            monthlyReportId={selectedReportId}
            livers={livers}
          />
          <ExchangeRateDialog
            key={rateKey}
            open={rateOpen}
            onOpenChange={setRateOpen}
            monthlyReportId={selectedReportId}
            currentRate={dashboardData.report.rate}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </>
      )}

      {/* レポート削除確認ダイアログ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>このレポートを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              関連するCSVデータと返金データも全て削除されます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteReport(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
