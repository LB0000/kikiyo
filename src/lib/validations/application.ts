import { z } from "zod";

const formTabValues = [
  "affiliation_check",
  "million_special",
  "streaming_auth",
  "subscription_cancel",
  "account_id_change",
  "event_build",
  "special_referral",
  "objection",
] as const;

export const createApplicationSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  birth_date: z.string().optional(),
  contact: z.string().optional(),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
  additional_info: z.string().optional(),
  tiktok_username: z.string().optional(),
  tiktok_account_link: z
    .string()
    .url("有効なURLを入力してください")
    .optional()
    .or(z.literal("")),
  id_verified: z.boolean().optional(),
  form_tab: z.enum(formTabValues, {
    message: "有効な申請種別を選択してください",
  }),
  agency_id: z.string().optional(),
  form_data: z.record(z.string(), z.unknown()).optional(),
});

export type CreateApplicationValues = z.infer<typeof createApplicationSchema>;
