"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LiversTable } from "./livers-table";
import { LiverEditDialog } from "./liver-edit-dialog";
import { BulkStatusDialog } from "./bulk-status-dialog";
import type { LiverRow } from "@/lib/actions/livers";

type Props = {
  livers: LiverRow[];
};

export function LiversClient({ livers }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedLiver, setSelectedLiver] = useState<LiverRow | null>(null);

  function handleSelect(liver: LiverRow) {
    setSelectedLiver(liver);
    setEditOpen(true);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setBulkOpen(true)}>
          一括変更
        </Button>
      </div>
      <LiversTable livers={livers} onSelect={handleSelect} />
      <LiverEditDialog
        key={selectedLiver?.id ?? "new"}
        open={editOpen}
        onOpenChange={setEditOpen}
        liver={selectedLiver}
      />
      <BulkStatusDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        livers={livers}
      />
    </>
  );
}
