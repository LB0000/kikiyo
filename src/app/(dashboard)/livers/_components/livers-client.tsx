"use client";

import { useState } from "react";
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
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <span className="inline-block h-8 w-1 rounded bg-primary" />
          ライバー名簿
        </h1>
        <button
          type="button"
          className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => setBulkOpen(true)}
        >
          申請状況一括変更
        </button>
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
