"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  agencyFormSchema,
  type AgencyFormValues,
} from "@/lib/validations/agency";
import {
  agencyCompanyInfoSchema,
  type AgencyCompanyInfoValues,
} from "@/lib/validations/invoice";
import {
  createAgency,
  updateAgency,
  resendRegistrationEmail,
  getAgencyCompanyInfo,
  updateAgencyCompanyInfo,
  type AgencyWithHierarchy,
} from "@/lib/actions/agencies";
import { AGENCY_RANK_LABELS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agency: AgencyWithHierarchy | null;
  allAgencies: AgencyWithHierarchy[];
};

export function AgencyFormDialog({
  open,
  onOpenChange,
  agency,
  allAgencies,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const isEdit = !!agency;

  const form = useForm<AgencyFormValues>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: agency
      ? {
          name: agency.name,
          commission_rate: agency.commission_rate,
          rank: (["rank_2", "rank_3", "rank_4"] as const).includes(
            agency.rank as AgencyFormValues["rank"]
          )
            ? (agency.rank as AgencyFormValues["rank"])
            : "rank_2",
          email: "",
          parent_agency_ids: agency.parent_agencies.map(
            (p) => p.parent_agency_id
          ),
        }
      : {
          name: "",
          commission_rate: 0,
          rank: "rank_2",
          email: "",
          parent_agency_ids: [],
        },
  });

  async function onSubmitBasic(values: AgencyFormValues) {
    setLoading(true);
    try {
      if (isEdit) {
        const result = await updateAgency(agency.id, {
          name: values.name,
          commission_rate: values.commission_rate,
          rank: values.rank,
          parent_agency_ids: values.parent_agency_ids,
        });
        if (result.error) {
          toast.error("更新に失敗しました", { description: result.error });
        } else {
          toast.success("代理店情報を更新しました");
          onOpenChange(false);
        }
      } else {
        const result = await createAgency(values);
        if (result.error) {
          toast.error("登録に失敗しました", { description: result.error });
        } else {
          toast.success("代理店を登録しました");
          if (result.emailError) {
            toast.warning("登録メールの送信に失敗しました", {
              description: "仮パスワードを直接お伝えください。",
            });
          }
          onOpenChange(false);
        }
      }
    } catch (e) {
      console.error("[AgencyFormDialog]", e);
      toast.error("処理中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!agency) return;
    setResending(true);
    try {
      const result = await resendRegistrationEmail(agency.id);
      if ("error" in result) {
        toast.error("メール再送に失敗しました", { description: result.error });
        if ("tempPassword" in result && result.tempPassword) {
          toast.info(`仮パスワード: ${result.tempPassword}`, {
            description: "手動でお伝えください",
            duration: 15000,
          });
        }
      } else {
        toast.success("認証メールを再送しました");
      }
    } catch {
      toast.error("処理中にエラーが発生しました");
    } finally {
      setResending(false);
    }
  }

  const availableParents = allAgencies.filter((a) => a.id !== agency?.id);

  const basicForm = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitBasic)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>代理店名</FormLabel>
              <FormControl>
                <Input placeholder="代理店名を入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEdit ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">メールアドレス</label>
            <div className="flex items-center gap-2">
              <Input
                value={agency.email ?? ""}
                readOnly
                className="bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={resending}
                onClick={handleResend}
                className="shrink-0"
              >
                <Send className="size-4" />
                {resending ? "送信中..." : "認証メール再送"}
              </Button>
            </div>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>メールアドレス</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="commission_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>手数料率 (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={field.value * 100}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value) / 100 || 0)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rank"
          render={({ field }) => (
            <FormItem>
              <FormLabel>代理店ランク</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="ランクを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(AGENCY_RANK_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent_agency_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>上位代理店</FormLabel>
              <FormControl>
                <MultiCombobox
                  options={availableParents.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="上位代理店を検索・選択"
                  searchPlaceholder="代理店名で検索..."
                  emptyText="該当する代理店がありません"
                  disablePortal
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `${agency.name} - 代理店情報` : "代理店新規登録"}
          </DialogTitle>
        </DialogHeader>
        {isEdit ? (
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="company">会社情報</TabsTrigger>
            </TabsList>
            <TabsContent value="basic">
              {basicForm}
            </TabsContent>
            <TabsContent value="company">
              <CompanyInfoTab
                agencyId={agency.id}
                open={open}
                onClose={() => onOpenChange(false)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          basicForm
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompanyInfoTab({
  agencyId,
  open,
  onClose,
}: {
  agencyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const form = useForm<AgencyCompanyInfoValues>({
    resolver: zodResolver(agencyCompanyInfoSchema),
    defaultValues: {
      invoice_registration_number: "",
      company_address: "",
      representative_name: "",
      bank_name: "",
      bank_branch: "",
      bank_account_type: "",
      bank_account_number: "",
      bank_account_holder: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    getAgencyCompanyInfo(agencyId)
      .then((result) => {
        if ("data" in result && result.data) {
          form.reset({
            invoice_registration_number:
              result.data.invoice_registration_number ?? "",
            company_address: result.data.company_address ?? "",
            representative_name: result.data.representative_name ?? "",
            bank_name: result.data.bank_name ?? "",
            bank_branch: result.data.bank_branch ?? "",
            bank_account_type: result.data.bank_account_type ?? "",
            bank_account_number: result.data.bank_account_number ?? "",
            bank_account_holder: result.data.bank_account_holder ?? "",
          });
        }
        setFetching(false);
      })
      .catch(() => {
        toast.error("会社情報の取得に失敗しました");
        setFetching(false);
      });
  }, [open, agencyId, form]);

  async function onSubmit(values: AgencyCompanyInfoValues) {
    setLoading(true);
    const result = await updateAgencyCompanyInfo(agencyId, values);
    if ("error" in result) {
      toast.error("更新に失敗しました", { description: result.error });
    } else {
      toast.success("会社情報を更新しました");
      onClose();
    }
    setLoading(false);
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invoice_registration_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>インボイス登録番号</FormLabel>
              <FormControl>
                <Input
                  placeholder="T1234567890123"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>会社住所</FormLabel>
              <FormControl>
                <Input
                  placeholder="東京都..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="representative_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>代表者名</FormLabel>
              <FormControl>
                <Input
                  placeholder="山田太郎"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="rounded-lg border p-4 space-y-4">
          <p className="text-sm font-medium">振込先口座</p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>銀行名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="○○銀行"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>支店名</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="○○支店"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bank_account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座種別</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ACCOUNT_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bank_account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>口座番号</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1234567"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="bank_account_holder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>口座名義</FormLabel>
                <FormControl>
                  <Input
                    placeholder="カ）○○○○"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
