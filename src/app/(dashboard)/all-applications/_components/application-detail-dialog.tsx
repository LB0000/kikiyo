"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    { label: "代理店名", value: application.agency_name ?? "-" },
    { label: "氏名", value: application.name ?? "-" },
    { label: "申請種別", value: FORM_TAB_LABELS[application.form_tab] },
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
    {
      label: "申請日",
      value: new Date(application.created_at).toLocaleDateString("ja-JP"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <span className="inline-block h-6 w-1 rounded bg-pink-400" />
            申請詳細
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4">
          {details.map(({ label, value }) => (
            <div key={label}>
              <span className="text-sm text-muted-foreground">{label}</span>
              <p className="mt-1 text-sm break-all">{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <span className="text-sm font-medium">申請ステータス変更</span>
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

        <button
          className="mt-4 w-full rounded-lg bg-pink-400 py-3 text-sm font-medium text-white hover:bg-pink-500 transition-colors disabled:opacity-50"
          onClick={handleStatusChange}
          disabled={loading}
        >
          {loading ? "変更中..." : "更新する"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
