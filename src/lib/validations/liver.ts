import { z } from "zod";

export const updateLiverSchema = z.object({
  name: z.string().nullable().optional(),
  account_name: z.string().nullable().optional(),
  liver_id: z.string().nullable().optional(),
  email: z
    .string()
    .email("有効なメールアドレスを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  tiktok_username: z.string().nullable().optional(),
  link: z
    .string()
    .url("有効なURLを入力してください")
    .nullable()
    .optional()
    .or(z.literal("")),
  address: z.string().nullable().optional(),
  contact: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  acquisition_date: z.string().nullable().optional(),
  streaming_start_date: z.string().nullable().optional(),
});

export type UpdateLiverValues = z.infer<typeof updateLiverSchema>;
