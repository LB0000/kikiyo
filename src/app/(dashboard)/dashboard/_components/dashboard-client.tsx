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
  type MonthlyReportItem,
  type DashboardData,
} from "@/lib/actions/dashboard";
import { REVENUE_TASK_LABELS } from "@/lib/constants";
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
  const [csvKey, setCsvKey] = useState(0);
  const [refundKey, setRefundKey] = useState(0);
  const [rateKey, setRateKey] = useState(0);

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
      const result = await getDashboardData(selectedReportId, agencyFilter);
      if (cancelled) return;
      if ("error" in result) {
        setDashboardData(null);
      } else {
        setDashboardData(result);
      }
      setLoading(false);
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedReportId, agencyFilter]);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          オールインTikTokバックエンド
        </h1>
        <div className="flex gap-3">
          {selectedReportId && dashboardData && (
            <>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => { setRateKey((k) => k + 1); setRateOpen(true); }}
              >
                為替レート変更
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => { setRefundKey((k) => k + 1); setRefundOpen(true); }}
              >
                返金登録
              </button>
            </>
          )}
          <button
            type="button"
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}
          >
            CSV登録
          </button>
        </div>
      </div>

      {/* フィルター行 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">表示期間</span>
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
                  {new Date(r.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agencyFilter"
                checked={filterMode === "all"}
                onChange={() => setFilterMode("all")}
                className="accent-primary"
              />
              <span className="text-sm">全表示</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="agencyFilter"
                checked={filterMode === "agency"}
                onChange={() => setFilterMode("agency")}
                className="accent-primary"
              />
              <span className="text-sm">代理店指定</span>
            </label>
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

      {/* サマリーカード */}
      {dashboardData && (
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
      )}

      {/* データ/返金タブ */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          読み込み中...
        </div>
      ) : dashboardData ? (
        <Tabs defaultValue="data">
          <TabsList>
            <TabsTrigger value="data">データ一覧</TabsTrigger>
            <TabsTrigger value="refund">返金一覧</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="mt-4">
            <DataTable key={`${selectedReportId}-${agencyFilter ?? "all"}`} rows={dashboardData.csvRows} />
          </TabsContent>
          <TabsContent value="refund" className="mt-4">
            <RefundTable
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
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          CSVデータをアップロードしてください
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
          />
        </>
      )}
    </div>
  );
}
