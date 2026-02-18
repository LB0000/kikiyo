"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateExchangeRate } from "@/lib/actions/dashboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyReportId: string;
  currentRate: number;
};

export function ExchangeRateDialog({
  open,
  onOpenChange,
  monthlyReportId,
  currentRate,
}: Props) {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("有効な為替レートを入力してください");
      return;
    }

    setLoading(true);
    const result = await updateExchangeRate(monthlyReportId, rate);

    if ("error" in result) {
      toast.error("為替レート変更に失敗しました", {
        description: result.error,
      });
    } else {
      toast.success("為替レートを変更しました");
      onOpenChange(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>為替レート変更</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>現在のレート</Label>
            <p className="text-lg font-semibold">
              {currentRate.toLocaleString("ja-JP", {
                minimumFractionDigits: 2,
              })}
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
            <p className="text-xs text-muted-foreground">
              変更すると、関連する全CSVデータと返金データの円額が再計算されます。
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "変更中..." : "変更"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
