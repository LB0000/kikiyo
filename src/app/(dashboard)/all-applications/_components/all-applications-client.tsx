"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApplicationsTable } from "./applications-table";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { FORM_TAB_LABELS } from "@/lib/constants";
import type { ApplicationRow } from "@/lib/actions/applications";

type Props = {
  applications: ApplicationRow[];
};

export function AllApplicationsClient({ applications }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);
  const [filterTab, setFilterTab] = useState<string>("all");

  function handleSelect(app: ApplicationRow) {
    setSelected(app);
    setDialogOpen(true);
  }

  const filtered =
    filterTab === "all"
      ? applications
      : applications.filter((a) => a.form_tab === filterTab);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          申請一覧
        </h1>
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
