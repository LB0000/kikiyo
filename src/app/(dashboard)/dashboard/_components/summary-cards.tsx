"use client";

import {
  TrendingUp,
  ArrowRightLeft,
  Gem,
  Gift,
  Receipt,
  ReceiptText,
  Percent,
  Banknote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  icon: LucideIcon;
  iconColor: string;
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
      value: revenueTask ?? "未設定",
      icon: TrendingUp,
      iconColor: "text-violet-500",
    },
    {
      label: "為替レート",
      value: fmt(exchangeRate),
      icon: ArrowRightLeft,
      iconColor: "text-blue-500",
    },
    {
      label: "ダイヤ数(合計)",
      value: fmt(totalDiamonds),
      icon: Gem,
      iconColor: "text-cyan-500",
    },
    {
      label: "ボーナス(合計)",
      value: fmt(totalBonus),
      icon: Gift,
      iconColor: "text-amber-500",
    },
    {
      label: "合計金額(税抜)",
      value: fmtJpy(netAmountExTax),
      icon: Receipt,
      iconColor: "text-emerald-500",
    },
    {
      label: "合計金額(税込)",
      value: fmtJpy(netAmountIncTax),
      icon: ReceiptText,
      iconColor: "text-teal-500",
    },
    {
      label: "代理店手数料率",
      value: commissionRate > 0 ? fmtPercent(commissionRate) : "-",
      icon: Percent,
      iconColor: "text-orange-500",
    },
    {
      label: "お支払い金額(税込)",
      value: fmtJpy(agencyPaymentIncTax),
      highlight: true,
      icon: Banknote,
      iconColor: "text-primary",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${
              card.highlight
                ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10"
                : "bg-card"
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                  card.highlight ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Icon
                  className={`size-3.5 ${card.highlight ? "text-primary" : card.iconColor}`}
                />
              </div>
              <p
                className={`text-xs ${card.highlight ? "font-medium text-primary/70" : "text-muted-foreground"}`}
              >
                {card.label}
              </p>
            </div>
            <p
              className={`mt-2 text-right text-2xl font-bold ${card.highlight ? "text-primary" : ""}`}
            >
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
