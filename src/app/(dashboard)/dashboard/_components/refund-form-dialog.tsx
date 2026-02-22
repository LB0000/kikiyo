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
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";
import { createRefund } from "@/lib/actions/dashboard";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyReportId: string;
  livers: { id: string; name: string | null }[];
};

export function RefundFormDialog({
  open,
  onOpenChange,
  monthlyReportId,
  livers,
}: Props) {
  const [liverId, setLiverId] = useState("");
  const [targetMonth, setTargetMonth] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!liverId) {
      toast.error("ライバーを選択してください");
      return;
    }

    setLoading(true);
    const result = await createRefund({
      liverId,
      targetMonth: targetMonth ? `${targetMonth}-01` : new Date().toISOString().slice(0, 10),
      amountUsd: parseFloat(amountUsd) || 0,
      reason,
      monthlyReportId,
    });

    if ("error" in result) {
      toast.error("返金登録に失敗しました", { description: result.error });
    } else {
      toast.success("返金を登録しました");
      setLiverId("");
      setTargetMonth("");
      setAmountUsd("");
      setReason("");
      onOpenChange(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto gap-5">
        <DialogHeader>
          <DialogTitle>返金登録</DialogTitle>
          <DialogDescription>ライバーの返金情報を登録します</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>ライバー <span className="text-destructive/70">*</span></Label>
            <Combobox
              options={livers.map((liver) => ({
                value: liver.id,
                label: liver.name ?? liver.id,
              }))}
              value={liverId}
              onValueChange={setLiverId}
              placeholder="ライバーを選択"
              searchPlaceholder="ライバー名で検索..."
              emptyText="該当するライバーがいません"
            />
          </div>

          <div className="space-y-2">
            <Label>対象月</Label>
            <Input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>返金額 (USD) <span className="text-destructive/70">*</span></Label>
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
            <Label>返金理由</Label>
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
