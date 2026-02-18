"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">申請種別</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedTab}
                onValueChange={(v) => setSelectedTab(v as FormTab)}
                className="grid gap-2"
              >
                {ALL_FORM_TABS.map((tab) => (
                  <div key={tab} className="flex items-center space-x-2">
                    <RadioGroupItem value={tab} id={tab} />
                    <Label htmlFor={tab} className="font-normal">
                      {FORM_TAB_LABELS[tab]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">申請情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>メールアドレス *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>TikTokユーザー名</Label>
                  <Input
                    value={form.tiktok_username}
                    onChange={(e) =>
                      updateField("tiktok_username", e.target.value)
                    }
                  />
                </div>
              </div>

              {selectedTab === "affiliation_check" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>氏名</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>連絡先</Label>
                      <Input
                        value={form.contact}
                        onChange={(e) => updateField("contact", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>TikTokアカウントリンク</Label>
                    <Input
                      value={form.tiktok_account_link}
                      onChange={(e) =>
                        updateField("tiktok_account_link", e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>住所</Label>
                      <Input
                        value={form.address}
                        onChange={(e) => updateField("address", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>生年月日</Label>
                      <Input
                        type="date"
                        value={form.birth_date}
                        onChange={(e) =>
                          updateField("birth_date", e.target.value)
                        }
                      />
                    </div>
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
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">確認画面へ</Button>
          </div>
        </form>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">入力内容の確認</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("input")}>
              戻る
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "送信中..." : "送信"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === "complete" && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">申請が完了しました</p>
            <p className="mt-2 text-muted-foreground">
              管理者による確認をお待ちください。
            </p>
            <Button className="mt-6" onClick={handleReset}>
              新しい申請を作成
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-1">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value || "-"}</span>
    </div>
  );
}
