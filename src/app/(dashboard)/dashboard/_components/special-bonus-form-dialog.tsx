"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createSpecialBonus } from "@/lib/actions/dashboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyReportId: string;
  onSuccess?: () => void;
};

export function SpecialBonusFormDialog({
  open,
  onOpenChange,
  monthlyReportId,
  onSuccess,
}: Props) {
  const [targetMonth, setTargetMonth] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    try {
      const result = await createSpecialBonus({
        targetMonth: `${targetMonth}-01`,
        amountUsd: parseFloat(amountUsd) || 0,
        reason,
        monthlyReportId,
      });

      if ("error" in result) {
        toast.error("特別ボーナス登録に失敗しました", { description: result.error });
      } else {
        toast.success("特別ボーナスを登録しました");
        setTargetMonth("");
        setAmountUsd("");
        setReason("");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (err) {
      toast.error("エラーが発生しました", {
        description: err instanceof Error ? err.message : "不明なエラー",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto gap-5">
        <DialogHeader>
          <DialogTitle>特別ボーナス登録</DialogTitle>
          <DialogDescription>TikTokからの特別ボーナスを登録します</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>対象月 <span className="text-destructive/70">*</span></Label>
            <Input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>金額 (USD) <span className="text-destructive/70">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>理由</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
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
              {loading ? "登録中..." : "登録"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
