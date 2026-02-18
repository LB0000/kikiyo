"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { ApplicationsTable } from "./applications-table";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { FORM_TAB_LABELS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";
import type { ApplicationRow } from "@/lib/actions/applications";

type Props = {
  applications: ApplicationRow[];
};

const APPLICATION_COLUMNS: CsvColumn<ApplicationRow>[] = [
  {
    header: "送信日時",
    accessor: (r) => new Date(r.created_at).toLocaleString("ja-JP"),
  },
  { header: "申請種別", accessor: (r) => FORM_TAB_LABELS[r.form_tab] ?? r.form_tab },
  { header: "代理店名", accessor: (r) => r.agency_name },
  { header: "氏名", accessor: (r) => r.name },
  { header: "メールアドレス", accessor: (r) => r.email },
  {
    header: "ステータス",
    accessor: (r) => APPLICATION_STATUS_LABELS[r.status] ?? r.status,
  },
];

export function AllApplicationsClient({ applications }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [filterTab, setFilterTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  function handleSelect(app: ApplicationRow) {
    setSelected(app);
    setDialogOpen(true);
  }

  const filtered = applications.filter((a) => {
    if (filterTab !== "all" && a.form_tab !== filterTab) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        a.agency_name?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    return true;
  });

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          申請一覧
        </h1>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          すべての申請の確認とステータス管理
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="代理店名・氏名・メールで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filtered.length}件
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(
                filtered,
                APPLICATION_COLUMNS,
                `applications_${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
          >
            <Download className="size-4" />
            CSVエクスポート
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">絞り込み：</span>
          <Select value={filterTab} onValueChange={setFilterTab}>
            <SelectTrigger className="w-48" aria-label="絞り込み">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {Object.entries(FORM_TAB_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ApplicationsTable applications={filtered} onSelect={handleSelect} />
      <ApplicationDetailDialog
        key={selected?.id ?? "none"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={selected}
      />
    </>
  );
}
