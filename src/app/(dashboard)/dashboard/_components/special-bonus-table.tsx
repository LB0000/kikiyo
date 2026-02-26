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
import { Download, Star } from "lucide-react";
import { toast } from "sonner";
import { deleteSpecialBonus } from "@/lib/actions/dashboard";
import { EmptyState } from "@/components/shared/empty-state";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";

type SpecialBonusRow = {
  id: string;
  data_month: string | null;
  target_month: string;
  amount_usd: number;
  amount_jpy: number;
  reason: string | null;
};

type Props = {
  rows: SpecialBonusRow[];
  onDeleted?: () => void;
};

const CSV_COLUMNS: CsvColumn<SpecialBonusRow>[] = [
  { header: "データ月", accessor: (r) => r.data_month },
  { header: "対象月", accessor: (r) => r.target_month },
  { header: "金額(USD)", accessor: (r) => r.amount_usd },
  { header: "金額(JPY)", accessor: (r) => r.amount_jpy },
  { header: "理由", accessor: (r) => r.reason },
];

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function SpecialBonusTable({ rows, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const result = await deleteSpecialBonus(id);
      if ("error" in result) {
        toast.error("削除に失敗しました", { description: result.error });
      } else {
        toast.success("特別ボーナスを削除しました");
        onDeleted?.();
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
          icon={Star}
          title="特別ボーナスデータがありません"
          description="特別ボーナス登録ボタンからレコードを追加してください"
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
            exportCsv(rows, CSV_COLUMNS, `special_bonus_${new Date().toISOString().slice(0, 10)}.csv`)
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
              <TableHead>対象月</TableHead>
              <TableHead className="text-right">金額 (USD)</TableHead>
              <TableHead className="text-right">金額 (JPY)</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="text-center">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.data_month ?? "-"}</TableCell>
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
                        <AlertDialogTitle>特別ボーナスを削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                          この操作は取り消せません。特別ボーナスレコード（{fmt(row.amount_usd)} USD）を削除します。
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
