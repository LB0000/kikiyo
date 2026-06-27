import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 月次レポートの表示期間ラベルを生成する。
 * data_month（"202511" or "2025-11"）→ "2025/11"。null は created_at から年月を表示。
 */
export function formatDataMonth(dataMonth: string | null, createdAt: string): string {
  if (dataMonth) {
    if (/^\d{6}$/.test(dataMonth)) return `${dataMonth.slice(0, 4)}/${dataMonth.slice(4)}`;
    if (/^\d{4}-\d{2}$/.test(dataMonth)) return dataMonth.replace("-", "/");
    return dataMonth;
  }
  return new Date(createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit" });
}
