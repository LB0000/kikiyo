"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FORM_TAB_LABELS } from "@/lib/constants";
import { createApplication } from "@/lib/actions/applications";
import type { FormTab } from "@/lib/supabase/types";

type Props = {
  agencyId: string | null;
};

type Step = "input" | "confirm" | "complete";

const ALL_FORM_TABS = Object.keys(FORM_TAB_LABELS) as FormTab[];

export function ApplicationForm({ agencyId }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [selectedTab, setSelectedTab] = useState<FormTab>("affiliation_check");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    contact: "",
    tiktok_username: "",
    tiktok_account_link: "",
    address: "",
    birth_date: "",
    additional_info: "",
    id_verified: false,
  });

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email) {
      toast.error("メールアドレスは必須です");
      return;
    }
    setStep("confirm");
  }

  async function handleSubmit() {
    setLoading(true);
    const result = await createApplication({
      ...form,
      form_tab: selectedTab,
      agency_id: agencyId ?? undefined,
    });

    if (result.error) {
      toast.error("申請に失敗しました", { description: result.error });
      setStep("input");
    } else {
      toast.success("申請を送信しました");
      setStep("complete");
    }
    setLoading(false);
  }

  function handleReset() {
    setStep("input");
    setForm({
      name: "",
      email: "",
      contact: "",
      tiktok_username: "",
      tiktok_account_link: "",
      address: "",
      birth_date: "",
      additional_info: "",
      id_verified: false,
    });
  }

  // ステッププログレス
  const steps = ["入力", "確認", "完了"];
  const stepIndex = step === "input" ? 0 : step === "confirm" ? 1 : 2;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= stepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-sm ${
                i <= stepIndex ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <Separator className="w-12" orientation="horizontal" />
            )}
          </div>
        ))}
      </div>

      {/* Step: Input */}
      {step === "input" && (
        <form onSubmit={handleConfirm} className="space-y-6">
          {/* 申請種別 — 2×4 grid like Bubble */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">申請を選択してください</p>
            <p className="text-sm text-muted-foreground">
              以下の選択肢から申請種類を選び、必要な情報を入力してください。
            </p>
            <RadioGroup
              value={selectedTab}
              onValueChange={(v) => setSelectedTab(v as FormTab)}
              className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4"
            >
              {ALL_FORM_TABS.map((tab) => (
                <div key={tab} className="flex items-center space-x-2">
                  <RadioGroupItem value={tab} id={tab} />
                  <Label htmlFor={tab} className="font-normal text-sm whitespace-nowrap">
                    {FORM_TAB_LABELS[tab]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* 申請種別タイトル */}
          <div className="space-y-1">
            <p className="font-medium">{FORM_TAB_LABELS[selectedTab]}</p>
            <p className="text-sm text-muted-foreground">
              {selectedTab === "affiliation_check"
                ? "事務所所属チェックのための紐付け申請を行います。以下の情報を入力してください。"
                : `${FORM_TAB_LABELS[selectedTab]}の申請を行います。以下の情報を入力してください。`}
            </p>
          </div>

          {/* フォームフィールド */}
          <div className="space-y-5">
            {selectedTab === "affiliation_check" && (
              <>
                <div className="space-y-2">
                  <Label>氏名　※姓名つなげてご記入ください。</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>住所</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>生年月日　※18歳未満は登録不可となります。</Label>
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => updateField("birth_date", e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="space-y-2">
                  <Label>連絡先　※ハイフン無しでご入力ください</Label>
                  <Input
                    value={form.contact}
                    onChange={(e) => updateField("contact", e.target.value)}
                    placeholder="09099990000"
                    className="w-48"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>TikTokユーザー名</Label>
              <Input
                value={form.tiktok_username}
                onChange={(e) => updateField("tiktok_username", e.target.value)}
              />
            </div>

            {selectedTab === "affiliation_check" && (
              <>
                <div className="space-y-2">
                  <Label>TikTokアカウントリンク</Label>
                  <Input
                    value={form.tiktok_account_link}
                    onChange={(e) =>
                      updateField("tiktok_account_link", e.target.value)
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="id_verified"
                    checked={form.id_verified}
                    onCheckedChange={(checked) =>
                      updateField("id_verified", !!checked)
                    }
                  />
                  <Label htmlFor="id_verified" className="font-normal">
                    身分証明書を確認しましたか？
                  </Label>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>追加情報・備考</Label>
              <Textarea
                value={form.additional_info}
                onChange={(e) =>
                  updateField("additional_info", e.target.value)
                }
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="cursor-pointer rounded-full bg-primary px-8 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              確認画面へ
            </button>
          </div>
        </form>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="text-lg font-medium">入力内容の確認</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <ConfirmRow label="申請種別" value={FORM_TAB_LABELS[selectedTab]} />
              <ConfirmRow label="メールアドレス" value={form.email} />
              <ConfirmRow label="TikTokユーザー名" value={form.tiktok_username} />
              {selectedTab === "affiliation_check" && (
                <>
                  <ConfirmRow label="氏名" value={form.name} />
                  <ConfirmRow label="連絡先" value={form.contact} />
                  <ConfirmRow
                    label="TikTokアカウントリンク"
                    value={form.tiktok_account_link}
                  />
                  <ConfirmRow label="住所" value={form.address} />
                  <ConfirmRow label="生年月日" value={form.birth_date} />
                  <ConfirmRow
                    label="身分証明書確認"
                    value={form.id_verified ? "はい" : "いいえ"}
                  />
                </>
              )}
              <ConfirmRow label="追加情報" value={form.additional_info} />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              className="cursor-pointer rounded-full border border-primary px-8 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setStep("input")}
            >
              戻る
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full bg-primary px-8 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <div className="rounded-lg border py-12 text-center">
          <p className="text-lg font-medium">申請が完了しました</p>
          <p className="mt-2 text-muted-foreground">
            管理者による確認をお待ちください。
          </p>
          <button
            type="button"
            className="cursor-pointer mt-6 rounded-full bg-primary px-8 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={handleReset}
          >
            新しい申請を作成
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="mt-1 text-sm">{value || "-"}</p>
    </div>
  );
}
