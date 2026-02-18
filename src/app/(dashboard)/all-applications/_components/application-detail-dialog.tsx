"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  APPLICATION_STATUS_LABELS,
  FORM_TAB_LABELS,
} from "@/lib/constants";
import {
  updateApplicationStatus,
  type ApplicationRow,
} from "@/lib/actions/applications";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: ApplicationRow | null;
};

export function ApplicationDetailDialog({
  open,
  onOpenChange,
  application,
}: Props) {
  const [status, setStatus] = useState<ApplicationStatus>(
    application?.status ?? "pending"
  );
  const [loading, setLoading] = useState(false);

  if (!application) return null;

  async function handleStatusChange() {
    if (!application) return;
    setLoading(true);

    const result = await updateApplicationStatus(application.id, status);
    if (result.error) {
      toast.error("ステータス変更に失敗しました", {
        description: result.error,
      });
    } else {
      toast.success("ステータスを変更しました");
      onOpenChange(false);
    }
    setLoading(false);
  }

  const details: { label: string; value: string }[] = [
    { label: "申請種別", value: FORM_TAB_LABELS[application.form_tab] },
    { label: "氏名", value: application.name ?? "-" },
    { label: "メールアドレス", value: application.email ?? "-" },
    { label: "連絡先", value: application.contact ?? "-" },
    { label: "TikTokユーザー名", value: application.tiktok_username ?? "-" },
    {
      label: "TikTokアカウントリンク",
      value: application.tiktok_account_link ?? "-",
    },
    { label: "住所", value: application.address ?? "-" },
    { label: "生年月日", value: application.birth_date ?? "-" },
    {
      label: "身分証明書確認",
      value: application.id_verified ? "はい" : "いいえ",
    },
    { label: "追加情報", value: application.additional_info ?? "-" },
    { label: "代理店", value: application.agency_name ?? "-" },
    {
      label: "申請日",
      value: new Date(application.created_at).toLocaleDateString("ja-JP"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>申請詳細</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">現在のステータス:</span>
            <Badge>
              {APPLICATION_STATUS_LABELS[application.status]}
            </Badge>
          </div>

          <Separator />

          {details.map(({ label, value }) => (
            <div key={label} className="flex gap-4 py-1">
              <span className="w-40 shrink-0 text-sm text-muted-foreground">
                {label}
              </span>
              <span className="text-sm break-all">{value}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3">
          <Label>ステータス変更</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ApplicationStatus)}
          >
            <SelectTrigger aria-label="ステータスを選択">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(APPLICATION_STATUS_LABELS).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button onClick={handleStatusChange} disabled={loading}>
            {loading ? "変更中..." : "ステータスを変更"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
