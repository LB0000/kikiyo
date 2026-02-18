import { z } from "zod";

export const agencyFormSchema = z.object({
  name: z.string().min(1, "代理店名は必須です"),
  commission_rate: z
    .number({ message: "手数料率を入力してください" })
    .min(0, "0以上で入力してください")
    .max(1, "1以下で入力してください"),
  rank: z.enum(["rank_2", "rank_3", "rank_4"], {
    message: "代理店ランクを選択してください",
  }),
  email: z.string().email("有効なメールアドレスを入力してください"),
  parent_agency_ids: z.array(z.string()),
});

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;
