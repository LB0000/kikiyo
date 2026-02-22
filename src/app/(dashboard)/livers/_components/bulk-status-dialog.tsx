"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { toast } from "sonner";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { STATUS_DOT_COLORS } from "@/components/shared/status-badge";
import { bulkUpdateLiverStatus, type LiverRow } from "@/lib/actions/livers";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  livers: LiverRow[];
};

export function BulkStatusDialog({ open, onOpenChange, livers }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ApplicationStatus>("completed");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error("ライバーを選択してください");
      return;
    }

    setLoading(true);
    try {
      const result = await bulkUpdateLiverStatus(selectedIds, status);

      if (result.error) {
        toast.error("一括変更に失敗しました", { description: result.error });
      } else {
        toast.success("申請状況を一括変更しました");
        setSelectedIds([]);
        onOpenChange(false);
      }
    } catch {
      toast.error("一括変更中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>申請状況一括変更</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>変更後のステータス</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as ApplicationStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPLICATION_STATUS_LABELS).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${STATUS_DOT_COLORS[value as ApplicationStatus]}`} />
                        {label}
                      </span>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>対象ライバー ({selectedIds.length}件選択中)</Label>
            <MultiCombobox
              options={livers.map((liver) => ({
                value: liver.id,
                label:
                  liver.name ??
                  liver.account_name ??
                  liver.liver_id ??
                  "不明",
              }))}
              value={selectedIds}
              onValueChange={setSelectedIds}
              placeholder="ライバーを検索・選択"
              searchPlaceholder="ライバー名で検索..."
              emptyText="該当するライバーがいません"
              disablePortal
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "変更中..." : "一括変更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
