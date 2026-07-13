"use client";

import { useMemo, useState, useTransition } from "react";
import { Coins } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PAYEE_KIND_LABELS } from "@/lib/constants";
import { formatDataMonth } from "@/lib/utils";
import { getDistributions, type DistributionListItem } from "@/lib/actions/distributions";
import type { MonthlyReportItem } from "@/lib/actions/dashboard";
import type { PayeeKind, UserRole } from "@/lib/supabase/types";

type Props = {
  reports: MonthlyReportItem[];
  userRole: UserRole;
  initialReportId: string | null;
  initialRows: DistributionListItem[];
};

const BADGE_VARIANT: Record<PayeeKind, "default" | "secondary" | "outline"> = {
  total_side: "outline",
  manager: "default",
  agency: "secondary",
  scout: "secondary",
};

function roleDescription(role: UserRole): string {
  if (role === "manager_user") return "ご担当の代理店分の分配内訳を表示しています。";
  if (role === "scout_user") return "あなたへの分配内訳を表示しています。";
  return "全代理店の分配内訳（トータルサイド含む）を表示しています。";
}

export function DistributionsClient({
  reports,
  userRole,
  initialReportId,
  initialRows,
}: Props) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(initialReportId);
  const [rows, setRows] = useState<DistributionListItem[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  function handleReportChange(reportId: string) {
    setSelectedReportId(reportId);
    startTransition(async () => {
      const next = await getDistributions(reportId);
      setRows(next);
    });
  }

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.amount_jpy), 0),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          分配明細
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{roleDescription(userRole)}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/30 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">表示期間</span>
          <Select value={selectedReportId ?? undefined} onValueChange={handleReportChange}>
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
        </div>
        <div className="text-sm text-muted-foreground">
          合計分配額 <span className="ml-1 font-bold text-foreground">{total.toLocaleString("ja-JP")}円</span>
        </div>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={Coins} title="月次レポートがありません" description="CSVを取り込むと分配明細が表示されます。" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="分配明細がありません"
          description={isPending ? "読み込み中…" : "この期間に対象の分配はありません。"}
        />
      ) : (
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>分配先種別</TableHead>
                <TableHead>分配先</TableHead>
                <TableHead>分配元代理店</TableHead>
                <TableHead className="text-right">基準額</TableHead>
                <TableHead className="text-right">分配率</TableHead>
                <TableHead className="text-right">インボイス控除</TableHead>
                <TableHead className="text-right">分配額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge variant={BADGE_VARIANT[row.payee_kind]}>
                      {PAYEE_KIND_LABELS[row.payee_kind]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{row.payee_name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.source_agency_name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{Number(row.base_amount_jpy).toLocaleString("ja-JP")}円</TableCell>
                  <TableCell className="text-right tabular-nums">{(Number(row.applied_rate) * 100).toFixed(2)}%</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {Number(row.royalty_deduction_jpy) > 0
                      ? `−${Number(row.royalty_deduction_jpy).toLocaleString("ja-JP")}円`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{Number(row.amount_jpy).toLocaleString("ja-JP")}円</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
