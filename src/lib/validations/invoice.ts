import { z } from "zod";

export const createInvoiceSchema = z.object({
  agencyId: z.string().uuid("無効な代理店IDです"),
  monthlyReportId: z.string().uuid("無効なレポートIDです"),
});

export const agencyCompanyInfoSchema = z.object({
  invoice_registration_number: z
    .string()
    .refine(
      (v) => v === "" || /^T[0-9]{13}$/.test(v),
      "T + 13桁の数字で入力してください"
    ),
  company_address: z.string(),
  representative_name: z.string(),
  bank_name: z.string(),
  bank_branch: z.string(),
  bank_account_type: z.enum(["futsu", "toza", ""]),
  bank_account_number: z.string(),
  bank_account_holder: z.string(),
});

export type CreateInvoiceValues = z.infer<typeof createInvoiceSchema>;
export type AgencyCompanyInfoValues = z.infer<typeof agencyCompanyInfoSchema>;
