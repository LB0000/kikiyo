"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { STATUS_DOT_COLORS } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  updateApplicationStatus,
  type ApplicationRow,
} from "@/lib/actions/applications";
import type { ApplicationStatus, FormTab } from "@/lib/supabase/types";

/** フォーム種別ごとの form_data フィールドラベル */
const FORM_DATA_LABELS: Record<string, Record<string, string>> = {
  million_special: {
    follower_count: "フォロワー数",
  },
  streaming_auth: {
    reason: "配信理由",
  },
  subscription_cancel: {
    reason: "解除理由",
  },
  account_id_change: {
    new_username: "新しいユーザー名",
    reason: "変更理由",
  },
  event_build: {
    event_name: "イベント名",
    event_date: "イベント日時",
    event_description: "イベント説明",
  },
  special_referral: {
    referral_details: "送客詳細",
  },
  objection: {
    objection_details: "異議内容",
    objection_status: "異議申し立て状況",
    violation_type: "違反種類",
    objection_target: "対象",
  },
};

/** 異議申し立てチェックボックスの値→日本語ラベル変換マップ */
const OBJECTION_VALUE_LABELS: Record<string, Record<string, string>> = {
  objection_status: {
    self_objected: "ご本人にて異議申し立て済み",
  },
  violation_type: {
    dangerous_act: "危険行為",
    suicide_self_harm: "自殺・自傷行為",
    violence: "暴力",
    hate_harassment: "ヘイト・嫌がらせ",
    sexual_content: "性的コンテンツ",
    minor: "未成年者",
    illegal_spam_impersonation: "違法行為・スパム・なりすまし",
    low_quality: "低品質コンテンツ",
    suspension_ban: "停止・BAN",
    other: "その他",
  },
  objection_target: {
    live: "LIVE",
    post: "投稿",
    comment: "コメント",
  },
};

function resolveCheckboxValues(key: string, raw: string): string {
  const map = OBJECTION_VALUE_LABELS[key];
  if (!map) return raw;
  return raw
    .split(",")
    .map((v) => map[v] ?? v)
    .join("、");
}

function getFormDataDetails(
  formTab: FormTab,
  formData: Record<string, unknown> | null
): { label: string; value: string }[] {
  if (!formData) return [];
  const labels = FORM_DATA_LABELS[formTab];
  if (!labels) return [];

  return Object.entries(labels)
    .map(([key, label]) => {
      const raw = formData[key] != null ? String(formData[key]) : "";
      const value = OBJECTION_VALUE_LABELS[key]
        ? resolveCheckboxValues(key, raw)
        : raw;
      return { label, value };
    })
    .filter((item) => item.value);
}

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
  const currentStatus = application?.status ?? "pending";
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  // application が変更されたら status を同期
  const [prevStatus, setPrevStatus] = useState(currentStatus);
  if (currentStatus !== prevStatus) {
    setPrevStatus(currentStatus);
    setStatus(currentStatus);
  }

  if (!application) return null;

  async function handleStatusChange() {
    if (!application) return;
    setLoading(true);
    try {
      const result = await updateApplicationStatus(application.id, status);
      if ("error" in result) {
        toast.error("ステータス変更に失敗しました", {
          description: result.error,
        });
      } else if (result.liverCreated) {
        toast.success("ステータスを変更し、ライバーを作成しました");
        onOpenChange(false);
      } else if (result.liverSynced) {
        toast.success("ステータスを変更し、ライバー名簿に反映しました");
        onOpenChange(false);
      } else {
        toast.success("ステータスを変更しました");
        onOpenChange(false);
      }
    } catch {
      toast.error("ステータス変更中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const formDataDetails = getFormDataDetails(
    application.form_tab,
    application.form_data
  );

  const details: { label: string; value: string }[] = [
    { label: "代理店名", value: application.agency_name ?? "-" },
    { label: "申請種別", value: FORM_TAB_LABELS[application.form_tab] },
    { label: "メールアドレス", value: application.email ?? "-" },
    { label: "TikTokユーザー名", value: application.tiktok_username ?? "-" },
  ];

  // 紐付け申請の場合は追加フィールドを表示
  if (application.form_tab === "affiliation_check") {
    details.push(
      { label: "氏名", value: application.name ?? "-" },
      { label: "連絡先", value: application.contact ?? "-" },
      { label: "TikTokアカウントリンク", value: application.tiktok_account_link ?? "-" },
      { label: "住所", value: application.address ?? "-" },
      { label: "生年月日", value: application.birth_date ?? "-" },
      { label: "身分証明書確認", value: application.id_verified ? "はい" : "いいえ" },
    );
  }

  // フォーム種別ごとの form_data フィールドを表示
  for (const item of formDataDetails) {
    details.push(item);
  }

  details.push(
    { label: "追加情報", value: application.additional_info ?? "-" },
    { label: "申請日", value: new Date(application.created_at).toLocaleDateString("ja-JP") },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <span className="inline-block h-6 w-1 rounded bg-primary" />
            申請詳細
          </DialogTitle>
          <DialogDescription>申請の詳細情報とステータス変更を行います。</DialogDescription>
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

        <Button
          className="mt-4 w-full"
          onClick={handleStatusChange}
          disabled={loading}
        >
          {loading ? "変更中..." : "更新する"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
