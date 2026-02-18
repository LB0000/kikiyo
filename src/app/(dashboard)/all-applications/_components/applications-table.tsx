"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { FORM_TAB_LABELS } from "@/lib/constants";
import type { ApplicationRow } from "@/lib/actions/applications";

type Props = {
  applications: ApplicationRow[];
  onSelect: (app: ApplicationRow) => void;
};

const PAGE_SIZE = 10;

export function ApplicationsTable({ applications, onSelect }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedApps = applications.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>送信日時</TableHead>
              <TableHead>申請種別</TableHead>
              <TableHead>代理店名</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              pagedApps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    {new Date(app.created_at).toLocaleString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>{FORM_TAB_LABELS[app.form_tab]}</TableCell>
                  <TableCell>{app.agency_name ?? "-"}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-primary px-4 py-1 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                      onClick={() => onSelect(app)}
                    >
                      詳細
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
