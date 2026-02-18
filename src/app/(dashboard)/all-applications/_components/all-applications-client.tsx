"use client";

import { useState } from "react";
import { ApplicationsTable } from "./applications-table";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import type { ApplicationRow } from "@/lib/actions/applications";

type Props = {
  applications: ApplicationRow[];
};

export function AllApplicationsClient({ applications }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<ApplicationRow | null>(null);

  function handleSelect(app: ApplicationRow) {
    setSelected(app);
    setDialogOpen(true);
  }

  return (
    <>
      <ApplicationsTable applications={applications} onSelect={handleSelect} />
      <ApplicationDetailDialog
        key={selected?.id ?? "none"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={selected}
      />
    </>
  );
}
