"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  updateExchangeRate,
  previewRateChange,
  type RateChangePreview,
} from "@/lib/actions/dashboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyReportId: string;
  currentRate: number;
};

function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function fmtRate(n: number): string {
  return n.toLocaleString("ja-JP", { minimumFractionDigits: 2 });
}

function DiffValue({ oldVal, newVal }: { oldVal: number; newVal: number }) {
  const diff = newVal - oldVal;
  const color =
    diff > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : diff < 0
        ? "text-destructive"
        : "text-muted-foreground";
  const sign = diff > 0 ? "+" : "";
  return (
    <span className={`font-medium ${color}`}>
      {sign}{fmtJpy(diff)}
    </span>
  );
}

export function ExchangeRateDialog({
  open,
  onOpenChange,
  monthlyReportId,
  currentRate,
}: Props) {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RateChangePreview | null>(null);

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setPreview(null);
      setNewRate(currentRate.toString());
    }
    onOpenChange(isOpen);
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("有効な為替レートを入力してください");
      return;
    }
    if (rate === currentRate) {
      toast.error("現在のレートと同じです");
      return;
    }

    setLoading(true);
    const result = await previewRateChange(monthlyReportId, rate);
    setLoading(false);

    if ("error" in result) {
      toast.error("プレビューの取得に失敗しました", {
        description: result.error,
      });
      return;
    }

    setPreview(result);
  }

  async function handleConfirm() {
    if (!preview) return;

    setLoading(true);
    const result = await updateExchangeRate(monthlyReportId, preview.newRate);

    if ("error" in result) {
      toast.error("為替レート変更に失敗しました", {
        description: result.error,
      });
    } else {
      toast.success("為替レートを変更しました", {
        description: `${fmtRate(result.oldRate)} → ${fmtRate(preview.newRate)}`,
      });
      handleClose(false);
    }
    setLoading(false);
  }

  // ステップ2: プレビュー確認画面
  if (preview) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md gap-5">
          <DialogHeader>
            <DialogTitle>変更内容の確認</DialogTitle>
            <DialogDescription>
              以下の内容で為替レートを変更します。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* レート変更 */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">為替レート</p>
              <p className="text-lg font-bold tabular-nums">
                {fmtRate(preview.oldRate)}
                <span className="mx-2 text-muted-foreground">→</span>
                {fmtRate(preview.newRate)}
              </p>
            </div>

            {/* 影響範囲 */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">影響範囲</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">CSVデータ</p>
                  <p className="font-semibold">{preview.csvRowCount.toLocaleString()}件</p>
                </div>
                <div>
                  <p className="text-muted-foreground">返金データ</p>
                  <p className="font-semibold">{preview.refundRowCount.toLocaleString()}件</p>
                </div>
              </div>
            </div>

            {/* 金額差分 */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">金額の変化</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">合計報酬(JPY)</span>
                  <div className="text-right">
                    <span>{fmtJpy(preview.oldTotalRewardJpy)}</span>
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    <span className="font-semibold">{fmtJpy(preview.newTotalRewardJpy)}</span>
                    <span className="ml-2 text-xs">
                      (<DiffValue oldVal={preview.oldTotalRewardJpy} newVal={preview.newTotalRewardJpy} />)
                    </span>
                  </div>
                </div>
                {preview.refundRowCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">返金合計(JPY)</span>
                    <div className="text-right">
                      <span>{fmtJpy(preview.oldTotalRefundJpy)}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-semibold">{fmtJpy(preview.newTotalRefundJpy)}</span>
                      <span className="ml-2 text-xs">
                        (<DiffValue oldVal={preview.oldTotalRefundJpy} newVal={preview.newTotalRefundJpy} />)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreview(null)}
              disabled={loading}
            >
              戻る
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading ? "変更中..." : "変更を実行"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ステップ1: レート入力画面
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader>
          <DialogTitle>為替レート変更</DialogTitle>
          <DialogDescription>為替レートを変更して金額を再計算します</DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePreview} className="space-y-5">
          <div className="space-y-2">
            <Label>現在のレート</Label>
            <p className="text-lg font-semibold tabular-nums">
              {fmtRate(currentRate)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>新しいレート</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              変更すると、関連する全CSVデータと返金データの円額が再計算されます。
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "確認中..." : "影響を確認"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
