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
import { updateLiver, type LiverRow } from "@/lib/actions/livers";
import { Combobox } from "@/components/ui/combobox";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liver: LiverRow | null;
  agencies: { id: string; name: string }[];
  isAdmin: boolean;
};

export function LiverEditDialog({ open, onOpenChange, liver, agencies, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: liver?.name ?? "",
    account_name: liver?.account_name ?? "",
    liver_id: liver?.liver_id ?? "",
    tiktok_username: liver?.tiktok_username ?? "",
    email: liver?.email ?? "",
    link: liver?.link ?? "",
    address: liver?.address ?? "",
    contact: liver?.contact ?? "",
    birth_date: liver?.birth_date ?? "",
    acquisition_date: liver?.acquisition_date ?? "",
    streaming_start_date: liver?.streaming_start_date ?? "",
    agency_id: liver?.agency_id ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!liver) return;
    setLoading(true);
    try {
      const result = await updateLiver(liver.id, {
        name: form.name || null,
        account_name: form.account_name || null,
        liver_id: form.liver_id || null,
        tiktok_username: form.tiktok_username || null,
        email: form.email || null,
        link: form.link || null,
        address: form.address || null,
        contact: form.contact || null,
        birth_date: form.birth_date || null,
        acquisition_date: form.acquisition_date || null,
        streaming_start_date: form.streaming_start_date || null,
        ...(isAdmin ? { agency_id: form.agency_id || null } : {}),
      });

      if (result.error) {
        toast.error("更新に失敗しました", { description: result.error });
      } else {
        toast.success("ライバー情報を更新しました");
        onOpenChange(false);
      }
    } catch {
      toast.error("更新中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; type: string }[] = [
    { key: "name", label: "氏名", type: "text" },
    { key: "account_name", label: "アカウント名", type: "text" },
    { key: "liver_id", label: "ライバーID", type: "text" },
    { key: "tiktok_username", label: "TikTokユーザー名", type: "text" },
    { key: "email", label: "メールアドレス", type: "email" },
    { key: "link", label: "TikTokアカウントリンク", type: "url" },
    { key: "address", label: "住所", type: "text" },
    { key: "contact", label: "連絡先", type: "text" },
    { key: "birth_date", label: "生年月日", type: "date" },
    { key: "acquisition_date", label: "獲得日", type: "date" },
    { key: "streaming_start_date", label: "配信開始日", type: "date" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ライバー情報更新</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isAdmin && (
            <div className="space-y-1">
              <Label htmlFor="agency_id">代理店</Label>
              <Combobox
                id="agency_id"
                options={agencies.map((a) => ({ value: a.id, label: a.name }))}
                value={form.agency_id}
                onValueChange={(v) => setForm((prev) => ({ ...prev, agency_id: v }))}
                placeholder="代理店を選択"
                searchPlaceholder="代理店名で検索..."
                emptyText="代理店が見つかりません"
                disablePortal
              />
            </div>
          )}
          {fields.map(({ key, label, type }) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type={type}
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
