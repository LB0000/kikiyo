"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <div className="flex justify-end">
        <Button onClick={handleNew}>新規登録</Button>
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
