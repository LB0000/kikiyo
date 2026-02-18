"use client";

import { useState } from "react";
import { AgenciesTable } from "./agencies-table";
import { AgencyFormDialog } from "./agency-form-dialog";
import type { AgencyWithHierarchy } from "@/lib/actions/agencies";

type Props = {
  agencies: AgencyWithHierarchy[];
};

export function AgenciesClient({ agencies }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] =
    useState<AgencyWithHierarchy | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

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

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          代理店リスト
        </h1>
        <button
          type="button"
          className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={handleNew}
        >
          代理店登録
        </button>
      </div>
      <AgenciesTable agencies={agencies} onSelect={handleSelect} />
      <AgencyFormDialog
        key={dialogKey}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agency={selectedAgency}
        allAgencies={agencies}
      />
    </>
  );
}
