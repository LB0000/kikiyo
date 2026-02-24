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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Download, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { deleteRefund } from "@/lib/actions/dashboard";
import { EmptyState } from "@/components/shared/empty-state";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";

type RefundRow = {
  id: string;
  tiktok_username: string | null;
  account_name: string | null;
  creator_id: string | null;
  data_month: string | null;
  target_month: string;
  amount_usd: number;
  amount_jpy: number;
  reason: string | null;
};

type Props = {
  rows: RefundRow[];
  onRefundDeleted?: () => void;
};

const REFUND_COLUMNS: CsvColumn<RefundRow>[] = [
  { header: "データ月", accessor: (r) => r.data_month },
  { header: "TikTokユーザー名", accessor: (r) => r.tiktok_username },
  { header: "ニックネーム", accessor: (r) => r.account_name },
  { header: "クリエイターID", accessor: (r) => r.creator_id },
  { header: "対象月", accessor: (r) => r.target_month },
  { header: "返金額(USD)", accessor: (r) => r.amount_usd },
  { header: "返金額(JPY)", accessor: (r) => r.amount_jpy },
  { header: "理由", accessor: (r) => r.reason },
];

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function RefundTable({ rows, onRefundDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(refundId: string) {
    setDeletingId(refundId);
    try {
      const result = await deleteRefund(refundId);
      if ("error" in result) {
        toast.error("削除に失敗しました", { description: result.error });
      } else {
        toast.success("返金を削除しました");
        onRefundDeleted?.();
      }
    } catch {
      toast.error("エラーが発生しました");
    } finally {
      setDeletingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60">
        <EmptyState
          icon={ReceiptText}
          title="返金データがありません"
          description="返金登録ボタンからレコードを追加してください"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() =>
            exportCsv(rows, REFUND_COLUMNS, `refund_${new Date().toISOString().slice(0, 10)}.csv`)
          }
        >
          <Download className="size-3.5" />
          CSVエクスポート
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/60 shadow-[var(--card-shadow)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>データ月</TableHead>
              <TableHead>TikTokユーザー名</TableHead>
              <TableHead>ニックネーム</TableHead>
              <TableHead>クリエイターID</TableHead>
              <TableHead>対象月</TableHead>
              <TableHead className="text-right">返金額 (USD)</TableHead>
              <TableHead className="text-right">返金額 (JPY)</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.data_month ?? "-"}</TableCell>
                <TableCell>{row.tiktok_username ?? "-"}</TableCell>
                <TableCell>{row.account_name ?? "-"}</TableCell>
                <TableCell>{row.creator_id ?? "-"}</TableCell>
                <TableCell>{row.target_month}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(row.amount_usd)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmt(row.amount_jpy)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.reason ?? "-"}
                </TableCell>
                <TableCell className="text-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/50"
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? "削除中..." : "削除"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>返金を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          この操作は取り消せません。返金レコード（{fmt(row.amount_usd)} USD）を削除します。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(row.id)}>
                          削除する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
