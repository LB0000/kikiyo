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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
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
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            <span className="inline-block h-8 w-1 rounded bg-primary" />
            オールインTikTokバックエンド
          </h1>
          <p className="mt-1 pl-7 text-sm text-muted-foreground">
            月次レポートとデータの確認・管理
          </p>
        </div>
        <div className="flex gap-3">
          {selectedReportId && dashboardData && (
            <>
              {isAdmin && (
                <Button className="rounded-full" onClick={() => { setRateKey((k) => k + 1); setRateOpen(true); }}>
                  為替レート変更
                </Button>
              )}
              <Button className="rounded-full" onClick={() => { setRefundKey((k) => k + 1); setRefundOpen(true); }}>
                返金登録
              </Button>
            </>
          )}
          <Button className="rounded-full" onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}>
            CSV登録
          </Button>
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
                  {r.data_month || new Date(r.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* サマリーカード */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-4 ml-auto h-7 w-24 animate-pulse rounded bg-muted" />
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
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : dashboardData ? (
        <Tabs defaultValue="data">
          <TabsList>
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
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Upload className="size-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium">まだデータがありません</p>
            <p className="mt-1 text-sm text-muted-foreground">
              CSVファイルをアップロードしてダッシュボードを開始しましょう
            </p>
          </div>
          <Button className="rounded-full" onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}>
            CSVをアップロード
          </Button>
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
