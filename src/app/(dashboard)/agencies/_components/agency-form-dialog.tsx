"use client";

import { useState } from "react";
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
import { MultiCombobox } from "@/components/ui/multi-combobox";
import {
  agencyFormSchema,
  type AgencyFormValues,
} from "@/lib/validations/agency";
import {
  createAgency,
  updateAgency,
  type AgencyWithHierarchy,
} from "@/lib/actions/agencies";
import { AGENCY_RANK_LABELS } from "@/lib/constants";

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

  async function onSubmit(values: AgencyFormValues) {
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
    } catch {
      toast.error("処理中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const availableParents = allAgencies.filter((a) => a.id !== agency?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "代理店編集" : "代理店新規登録"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {!isEdit && (
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
      </DialogContent>
    </Dialog>
  );
}
