"use client";

import { Card, CardContent } from "@/components/ui/card";
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
};

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function fmtJpy(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")} JPY`;
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
      label: "収益タスク",
      value: revenueTask
        ? REVENUE_TASK_LABELS[revenueTask as RevenueTask] ?? revenueTask
        : "未設定",
    },
    {
      label: "為替レート",
      value: `${fmt(exchangeRate)} JPY/USD`,
    },
    {
      label: "合計ダイヤモンド",
      value: fmt(totalDiamonds),
    },
    {
      label: "合計ボーナス",
      value: fmt(totalBonus),
    },
    {
      label: "純額（税抜）",
      value: fmtJpy(netAmountExTax),
    },
    {
      label: "純額（税込）",
      value: fmtJpy(netAmountIncTax),
    },
    {
      label: "手数料率",
      value: fmtPercent(commissionRate),
    },
    {
      label: "代理店支払（税込）",
      value: fmtJpy(agencyPaymentIncTax),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
