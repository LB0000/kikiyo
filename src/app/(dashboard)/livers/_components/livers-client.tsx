"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";
import { STATUS_DOT_COLORS } from "@/components/shared/status-badge";
import { LiversTable } from "./livers-table";
import { LiverEditDialog } from "./liver-edit-dialog";
import { BulkStatusDialog } from "./bulk-status-dialog";
import type { LiverRow } from "@/lib/actions/livers";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  livers: LiverRow[];
  agencies: { id: string; name: string }[];
  isAdmin: boolean;
};

const LIVER_COLUMNS: CsvColumn<LiverRow>[] = [
  { header: "氏名", accessor: (r) => r.name },
  { header: "ライバーID", accessor: (r) => r.liver_id },
  { header: "アカウント名", accessor: (r) => r.account_name },
  { header: "TikTokユーザー名", accessor: (r) => r.tiktok_username },
  { header: "メールアドレス", accessor: (r) => r.email },
  { header: "連絡先", accessor: (r) => r.contact },
  { header: "申請状況", accessor: (r) => APPLICATION_STATUS_LABELS[r.status] },
  { header: "配信開始日", accessor: (r) => r.streaming_start_date },
  { header: "獲得日", accessor: (r) => r.acquisition_date },
  { header: "TikTokアカウントリンク", accessor: (r) => r.link },
];

export function LiversClient({ livers, agencies, isAdmin }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedLiver, setSelectedLiver] = useState<LiverRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  function handleSelect(liver: LiverRow) {
    setSelectedLiver(liver);
    setEditOpen(true);
  }

  const filtered = livers.filter((liver) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        liver.name?.toLowerCase().includes(q) ||
        liver.liver_id?.toLowerCase().includes(q) ||
        liver.account_name?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== "all" && liver.status !== statusFilter) return false;
    return true;
  });

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          ライバー名簿
        </h1>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          配信者の情報管理と申請状況の確認
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="氏名・ID・アカウント名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="ステータス絞り込み">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${STATUS_DOT_COLORS[value as ApplicationStatus]}`} />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length}件
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(filtered, LIVER_COLUMNS, `livers_${new Date().toISOString().slice(0, 10)}.csv`)
            }
          >
            <Download className="size-4" />
            CSVエクスポート
          </Button>
        </div>
        <Button className="rounded-full" onClick={() => setBulkOpen(true)}>
          申請状況一括変更
        </Button>
      </div>

      <LiversTable
        key={search + statusFilter}
        livers={filtered}
        onSelect={handleSelect}
      />
      <LiverEditDialog
        key={selectedLiver?.id ?? "new"}
        open={editOpen}
        onOpenChange={setEditOpen}
        liver={selectedLiver}
        agencies={agencies}
        isAdmin={isAdmin}
      />
      <BulkStatusDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        livers={livers}
      />
    </>
  );
}
