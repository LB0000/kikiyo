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
import { AGENCY_RANK_LABELS } from "@/lib/constants";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";
import { AgenciesTable } from "./agencies-table";
import { AgencyFormDialog } from "./agency-form-dialog";
import { AgencyCompanyInfoDialog } from "./agency-company-info-dialog";
import type { AgencyWithHierarchy } from "@/lib/actions/agencies";
import type { AgencyRank } from "@/lib/supabase/types";

type Props = {
  agencies: AgencyWithHierarchy[];
};

const AGENCY_COLUMNS: CsvColumn<AgencyWithHierarchy>[] = [
  { header: "代理店名", accessor: (r) => r.name },
  { header: "代理店ランク", accessor: (r) => r.rank ? AGENCY_RANK_LABELS[r.rank as AgencyRank] : "" },
  { header: "上位代理店", accessor: (r) => r.parent_agencies.map((p) => p.parent_name).join(", ") },
  { header: "手数料率", accessor: (r) => `${(r.commission_rate * 100).toFixed(1)}%` },
  { header: "提携日", accessor: (r) => new Date(r.created_at).toLocaleDateString("ja-JP") },
  { header: "ステータス", accessor: (r) => {
    if (r.last_sign_in_at) return "利用開始";
    if (r.registration_email_sent_at) return "招待済";
    return "未招待";
  }},
  { header: "メール送信日", accessor: (r) => r.registration_email_sent_at ? new Date(r.registration_email_sent_at).toLocaleDateString("ja-JP") : "" },
  { header: "最終ログイン日", accessor: (r) => r.last_sign_in_at ? new Date(r.last_sign_in_at).toLocaleDateString("ja-JP") : "" },
];

const ONBOARDING_STATUS_OPTIONS = [
  { value: "all", label: "すべてのステータス" },
  { value: "not_invited", label: "未招待" },
  { value: "invited", label: "招待済" },
  { value: "active", label: "利用開始" },
] as const;

function getOnboardingStatus(agency: AgencyWithHierarchy) {
  if (agency.last_sign_in_at) return "active";
  if (agency.registration_email_sent_at) return "invited";
  return "not_invited";
}

export function AgenciesClient({ agencies }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] =
    useState<AgencyWithHierarchy | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [companyInfoOpen, setCompanyInfoOpen] = useState(false);
  const [companyInfoAgency, setCompanyInfoAgency] =
    useState<AgencyWithHierarchy | null>(null);
  const [companyInfoKey, setCompanyInfoKey] = useState(0);

  function handleNew() {
    setSelectedAgency(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleSelect(agency: AgencyWithHierarchy) {
    setSelectedAgency(agency);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function handleCompanyInfo(agency: AgencyWithHierarchy) {
    setCompanyInfoAgency(agency);
    setCompanyInfoKey((k) => k + 1);
    setCompanyInfoOpen(true);
  }

  const filtered = agencies.filter((agency) => {
    if (search) {
      const q = search.toLowerCase();
      if (!agency.name.toLowerCase().includes(q)) return false;
    }
    if (rankFilter !== "all" && agency.rank !== rankFilter) return false;
    if (statusFilter !== "all" && getOnboardingStatus(agency) !== statusFilter) return false;
    return true;
  });

  return (
    <>
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          代理店リスト
        </h1>
        <p className="mt-1 pl-7 text-sm text-muted-foreground">
          代理店の登録情報と契約条件の管理
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="代理店名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 pl-9"
            />
          </div>
          <Select value={rankFilter} onValueChange={setRankFilter}>
            <SelectTrigger className="w-36" aria-label="ランク絞り込み">
              <SelectValue placeholder="すべてのランク" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのランク</SelectItem>
              {Object.entries(AGENCY_RANK_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44" aria-label="ステータス絞り込み">
              <SelectValue placeholder="すべてのステータス" />
            </SelectTrigger>
            <SelectContent>
              {ONBOARDING_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
              exportCsv(filtered, AGENCY_COLUMNS, `agencies_${new Date().toISOString().slice(0, 10)}.csv`)
            }
          >
            <Download className="size-4" />
            CSVエクスポート
          </Button>
        </div>
        <Button className="rounded-full" onClick={handleNew}>
          代理店登録
        </Button>
      </div>

      <AgenciesTable
        key={search + rankFilter + statusFilter}
        agencies={filtered}
        onSelect={handleSelect}
        onCompanyInfo={handleCompanyInfo}
      />
      <AgencyFormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agency={selectedAgency}
        allAgencies={agencies}
      />
      {companyInfoAgency && (
        <AgencyCompanyInfoDialog
          key={companyInfoKey}
          open={companyInfoOpen}
          onOpenChange={setCompanyInfoOpen}
          agencyId={companyInfoAgency.id}
          agencyName={companyInfoAgency.name}
        />
      )}
    </>
  );
}
