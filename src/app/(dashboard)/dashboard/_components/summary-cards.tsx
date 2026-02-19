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
    <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border p-5 transition-all duration-200 ${
              card.highlight
                ? "border-primary/25 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] shadow-[var(--card-highlight-shadow)] hover:shadow-[var(--card-highlight-shadow-hover)] hover:-translate-y-0.5"
                : "bg-card shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  card.highlight
                    ? "bg-primary/12 ring-1 ring-primary/10"
                    : "bg-muted/70 ring-1 ring-border/50"
                }`}
              >
                <Icon
                  className={`size-4 ${card.highlight ? "text-primary" : card.iconColor}`}
                />
              </div>
              <p
                className={`text-[11px] font-medium tracking-wide ${card.highlight ? "text-primary/80" : "text-muted-foreground/80"}`}
              >
                {card.label}
              </p>
            </div>
            <p
              className={`mt-3 text-right text-[1.625rem] font-bold tabular-nums tracking-tight ${card.highlight ? "text-primary" : "text-foreground"}`}
            >
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
