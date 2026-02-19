"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { FORM_TAB_LABELS } from "@/lib/constants";
import { createApplication } from "@/lib/actions/applications";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { FormTab } from "@/lib/supabase/types";

type Props = {
  agencyId: string | null;
  agencies?: { id: string; name: string }[];
};

type Step = "input" | "confirm" | "complete";

const ALL_FORM_TABS = Object.keys(FORM_TAB_LABELS) as FormTab[];
const PRIMARY_TABS: FormTab[] = ["affiliation_check", "million_special", "streaming_auth"];
const SECONDARY_TABS = ALL_FORM_TABS.filter((t) => !PRIMARY_TABS.includes(t));

/** フォーム種別ごとの form_data フィールド定義 */
const FORM_DATA_FIELDS: Record<string, { key: string; label: string; type: "text" | "textarea" | "date" }[]> = {
  million_special: [
    { key: "follower_count", label: "フォロワー数", type: "text" },
  ],
  streaming_auth: [
    { key: "reason", label: "配信理由", type: "textarea" },
  ],
  subscription_cancel: [
    { key: "reason", label: "解除理由", type: "textarea" },
  ],
  account_id_change: [
    { key: "new_username", label: "新しいユーザー名", type: "text" },
    { key: "reason", label: "変更理由", type: "textarea" },
  ],
  event_build: [
    { key: "event_name", label: "イベント名", type: "text" },
    { key: "event_date", label: "イベント日時", type: "date" },
    { key: "event_description", label: "イベント説明", type: "textarea" },
  ],
  special_referral: [
    { key: "referral_details", label: "送客詳細", type: "textarea" },
  ],
  objection: [
    { key: "objection_details", label: "異議内容", type: "textarea" },
  ],
};

export function ApplicationForm({ agencyId, agencies = [] }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [selectedTab, setSelectedTab] = useState<FormTab>("affiliation_check");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [loading, setLoading] = useState(false);

  // system_admin は agencyId が null → 代理店セレクターを表示
  const showAgencySelector = agencyId === null && agencies.length > 0;
  const agencyOptions: ComboboxOption[] = agencies.map((a) => ({
    value: a.id,
    label: a.name,
  }));
  const effectiveAgencyId = agencyId ?? (selectedAgencyId || undefined);

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

  const [formData, setFormData] = useState<Record<string, string>>({});

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateFormData(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
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
    // form_data から空文字を除いたオブジェクトを作成
    const cleanedFormData: Record<string, string> = {};
    for (const [k, v] of Object.entries(formData)) {
      if (v) cleanedFormData[k] = v;
    }

    const result = await createApplication({
      ...form,
      form_tab: selectedTab,
      agency_id: effectiveAgencyId,
      form_data: Object.keys(cleanedFormData).length > 0 ? cleanedFormData : undefined,
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
    setSelectedAgencyId("");
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
    setFormData({});
  }

  const currentFormDataFields = FORM_DATA_FIELDS[selectedTab] ?? [];

  // ステッププログレス
  const steps = ["入力", "確認", "完了"];
  const stepIndex = step === "input" ? 0 : step === "confirm" ? 1 : 2;

  return (
    <div className="space-y-6">
      {/* Progress (Goal-Gradient Effect) */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
                  i < stepIndex
                    ? "bg-green-500 text-white"
                    : i === stepIndex
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < stepIndex ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i < stepIndex
                    ? "font-medium text-green-600"
                    : i === stepIndex
                    ? "font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-12 transition-colors duration-300 ${
                  i < stepIndex ? "bg-green-500" : "bg-muted"
                }`} />
              )}
            </div>
          ))}
        </div>
        {step === "confirm" && (
          <p className="text-center text-sm text-green-600 font-medium">
            あと1ステップで完了です
          </p>
        )}
      </div>

      {/* Step: Input */}
      {step === "input" && (
        <form onSubmit={handleConfirm} className="space-y-6">
          {/* 申請種別 — 主要3つ + 折りたたみ (Hick's Law) */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">申請を選択してください</p>
            <p className="text-sm text-muted-foreground">
              以下の選択肢から申請種類を選び、必要な情報を入力してください。
            </p>
            <RadioGroup
              value={selectedTab}
              onValueChange={(v) => setSelectedTab(v as FormTab)}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
                {PRIMARY_TABS.map((tab) => (
                  <div key={tab} className="flex items-center space-x-2">
                    <RadioGroupItem value={tab} id={tab} />
                    <Label htmlFor={tab} className="font-normal text-sm whitespace-nowrap">
                      {FORM_TAB_LABELS[tab]}
                    </Label>
                  </div>
                ))}
              </div>
              <details className="group" open={SECONDARY_TABS.includes(selectedTab) || undefined}>
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  その他の申請種別を表示
                </summary>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3 mt-2">
                  {SECONDARY_TABS.map((tab) => (
                    <div key={tab} className="flex items-center space-x-2">
                      <RadioGroupItem value={tab} id={tab} />
                      <Label htmlFor={tab} className="font-normal text-sm whitespace-nowrap">
                        {FORM_TAB_LABELS[tab]}
                      </Label>
                    </div>
                  ))}
                </div>
              </details>
            </RadioGroup>
          </div>

          {showAgencySelector && (
            <div className="space-y-2">
              <Label>代理店</Label>
              <Combobox
                options={agencyOptions}
                value={selectedAgencyId}
                onValueChange={setSelectedAgencyId}
                placeholder="代理店を選択"
                searchPlaceholder="代理店名で検索"
                emptyText="代理店が見つかりません"
              />
            </div>
          )}

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

            {/* フォーム種別ごとの専用フィールド */}
            {currentFormDataFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={formData[field.key] ?? ""}
                    onChange={(e) => updateFormData(field.key, e.target.value)}
                    rows={3}
                  />
                ) : (
                  <Input
                    type={field.type === "date" ? "date" : "text"}
                    value={formData[field.key] ?? ""}
                    onChange={(e) => updateFormData(field.key, e.target.value)}
                    className={field.type === "date" ? "w-48" : undefined}
                  />
                )}
              </div>
            ))}

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
            <Button type="submit" className="rounded-full">
              確認画面へ
            </Button>
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
              {showAgencySelector && (
                <ConfirmRow
                  label="代理店"
                  value={agencies.find((a) => a.id === selectedAgencyId)?.name ?? "未選択"}
                />
              )}
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
              {currentFormDataFields.map((field) => (
                <ConfirmRow
                  key={field.key}
                  label={field.label}
                  value={formData[field.key] ?? ""}
                />
              ))}
              <ConfirmRow label="追加情報" value={form.additional_info} />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" className="rounded-full" onClick={() => setStep("input")}>
              戻る
            </Button>
            <Button className="rounded-full" onClick={handleSubmit} disabled={loading}>
              {loading ? "送信中..." : "送信"}
            </Button>
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
          <Button className="mt-6 rounded-full" onClick={handleReset}>
            新しい申請を作成
          </Button>
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
