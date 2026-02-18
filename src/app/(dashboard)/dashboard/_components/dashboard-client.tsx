"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
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
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>("all");
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

  useEffect(() => {
    if (!selectedReportId) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const agencyFilter =
        selectedAgencyId === "all" ? undefined : selectedAgencyId;
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
  }, [selectedReportId, selectedAgencyId]);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  return (
    <div className="space-y-6">
      {/* フィルター行 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">月次レポート</label>
          <Select
            value={selectedReportId}
            onValueChange={setSelectedReportId}
          >
            <SelectTrigger className="w-60" aria-label="月次レポートを選択">
              <SelectValue placeholder="レポートを選択" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {new Date(r.created_at).toLocaleDateString("ja-JP")} -{" "}
                  {r.revenue_task
                    ? REVENUE_TASK_LABELS[r.revenue_task as RevenueTask]
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">代理店</label>
            <Combobox
              options={[
                { value: "all", label: "全表示" },
                ...agencies.map((a) => ({ value: a.id, label: a.name })),
              ]}
              value={selectedAgencyId}
              onValueChange={(v) => setSelectedAgencyId(v || "all")}
              placeholder="代理店でフィルター"
              searchPlaceholder="代理店名で検索..."
              emptyText="該当する代理店がありません"
              className="w-48"
            />
          </div>
        )}

        <div className="ml-auto flex gap-2 self-end">
          <Button variant="outline" onClick={() => { setCsvKey((k) => k + 1); setCsvOpen(true); }}>
            CSVアップロード
          </Button>
          {selectedReportId && dashboardData && (
            <>
              <Button variant="outline" onClick={() => { setRefundKey((k) => k + 1); setRefundOpen(true); }}>
                返金登録
              </Button>
              <Button variant="outline" onClick={() => { setRateKey((k) => k + 1); setRateOpen(true); }}>
                為替レート変更
              </Button>
            </>
          )}
        </div>
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
            <DataTable rows={dashboardData.csvRows} />
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
