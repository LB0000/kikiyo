"use client";

import { REVENUE_TASK_LABELS } from "@/lib/constants";
import type { RevenueTask } from "@/lib/supabase/types";

type Props = {
  revenueTask: string | null;
  exchangeRate: number;
  totalDiamonds: number;
  totalBonus: number;
  netAmountExTax: number;
  netAmountIncTax: number;
  commissionRate: number;
  agencyPaymentIncTax: number;
};

type CardItem = {
  label: string;
  value: string;
  highlight?: boolean;
};

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function fmtJpy(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function fmtPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function SummaryCards({
  revenueTask,
  exchangeRate,
  totalDiamonds,
  totalBonus,
  netAmountExTax,
  netAmountIncTax,
  commissionRate,
  agencyPaymentIncTax,
}: Props) {
  const cards: CardItem[] = [
    {
      label: "レベニュー",
      value: revenueTask
        ? REVENUE_TASK_LABELS[revenueTask as RevenueTask] ?? revenueTask
        : "未設定",
    },
    {
      label: "為替レート",
      value: fmt(exchangeRate),
    },
    {
      label: "ダイヤ数(合計)",
      value: fmt(totalDiamonds),
    },
    {
      label: "ボーナス(合計)",
      value: fmt(totalBonus),
    },
    {
      label: "合計金額(税抜)",
      value: fmtJpy(netAmountExTax),
    },
    {
      label: "合計金額(税込)",
      value: fmtJpy(netAmountIncTax),
    },
    {
      label: "代理店手数料率",
      value: commissionRate > 0 ? fmtPercent(commissionRate) : "-",
    },
    {
      label: "お支払い金額(税込)",
      value: fmtJpy(agencyPaymentIncTax),
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg border p-4 ${
            card.highlight
              ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
              : "bg-card"
          }`}
        >
          <p className={`text-xs ${card.highlight ? "font-medium text-primary/70" : "text-muted-foreground"}`}>{card.label}</p>
          <p className={`mt-2 text-right text-2xl font-bold ${card.highlight ? "text-primary" : ""}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
