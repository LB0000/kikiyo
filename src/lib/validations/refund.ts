import { z } from "zod";

export const createRefundSchema = z.object({
  liverId: z.string().min(1, "ライバーを選択してください"),
  targetMonth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "有効な日付を入力してください"),
  amountUsd: z
    .number({ message: "返金額を入力してください" })
    .positive("返金額は正の数で入力してください"),
  reason: z.string().optional(),
  monthlyReportId: z.string().min(1, "月次レポートが必要です"),
});

export type CreateRefundValues = z.infer<typeof createRefundSchema>;
