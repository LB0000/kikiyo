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
import { toast } from "sonner";
import {
  agencyCompanyInfoSchema,
  type AgencyCompanyInfoValues,
} from "@/lib/validations/invoice";
import {
  getAgencyCompanyInfo,
  updateAgencyCompanyInfo,
} from "@/lib/actions/agencies";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  agencyName: string;
};

export function AgencyCompanyInfoDialog({
  open,
  onOpenChange,
  agencyId,
  agencyName,
}: Props) {
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
      onOpenChange(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{agencyName} - 会社情報</DialogTitle>
        </DialogHeader>
        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
