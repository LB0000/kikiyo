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
  Star,
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
  totalSpecialBonusJpy: number;
};

type CardItem = {
  label: string;
  value: string;
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

function SectionHeader({ title, primary }: { title: string; primary?: boolean }) {
  const textClass = primary ? "text-primary/70" : "text-muted-foreground/60";
  const lineFrom = primary ? "from-primary/40" : "from-border/60";
  return (
    <h3
      className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${textClass}`}
    >
      <span className={`h-px flex-1 bg-gradient-to-r ${lineFrom} to-transparent`} />
      <span>{title}</span>
      <span className={`h-px flex-1 bg-gradient-to-l ${lineFrom} to-transparent`} />
    </h3>
  );
}

function MetricCard({ label, value, icon: Icon, iconColor }: CardItem) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--card-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]">
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
          <Icon className={`size-4 ${iconColor}`} />
        </div>
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground/80">
          {label}
        </p>
      </div>
      <p className="mt-3 text-right text-[1.625rem] font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
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
  totalSpecialBonusJpy,
}: Props) {
  const performanceCards: CardItem[] = [
    { label: "ダイヤ数(合計)", value: fmt(totalDiamonds), icon: Gem, iconColor: "text-cyan-500" },
    { label: "ボーナス(合計)", value: fmt(totalBonus), icon: Gift, iconColor: "text-amber-500" },
  ];

  const financialCards: CardItem[] = [
    { label: "合計金額(税抜)", value: fmtJpy(netAmountExTax), icon: Receipt, iconColor: "text-emerald-500" },
    { label: "合計金額(税込)", value: fmtJpy(netAmountIncTax), icon: ReceiptText, iconColor: "text-teal-500" },
    { label: "代理店手数料率", value: commissionRate > 0 ? fmtPercent(commissionRate) : "-", icon: Percent, iconColor: "text-orange-500" },
    { label: "特別ボーナス", value: fmtJpy(totalSpecialBonusJpy), icon: Star, iconColor: "text-pink-500" },
  ];

  return (
    <div className="space-y-5">
      {/* 設定バー: レベニュー + 為替レート */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-border/40 bg-muted/20 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-500/10 ring-1 ring-violet-500/20">
            <TrendingUp className="size-3.5 text-violet-500" />
          </div>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70">
            レベニュー
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {revenueTask ?? "未設定"}
          </span>
        </div>

        <div className="h-5 w-px bg-border/50" />

        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/10 ring-1 ring-blue-500/20">
            <ArrowRightLeft className="size-3.5 text-blue-500" />
          </div>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70">
            為替レート
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {fmt(exchangeRate)}
          </span>
        </div>
      </div>

      {/* TikTok実績 */}
      <div className="space-y-3">
        <SectionHeader title="TikTok実績" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {performanceCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* 金額 */}
      <div className="space-y-3">
        <SectionHeader title="金額" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {financialCards.map((card) => (
            <MetricCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* お支払い */}
      <div className="space-y-3">
        <SectionHeader title="お支払い" primary />
        <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-primary/[0.08] p-6 shadow-[var(--card-highlight-shadow)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--card-highlight-shadow-hover)]">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/10">
              <Banknote className="size-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-primary/70">
                お支払い金額(税込)
              </p>
              <p className="mt-1 text-[2rem] font-bold tabular-nums tracking-tight text-primary">
                {fmtJpy(agencyPaymentIncTax)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
