"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FORM_TAB_LABELS } from "@/lib/constants";
import type { ApplicationRow } from "@/lib/actions/applications";

type Props = {
  applications: ApplicationRow[];
  onSelect: (app: ApplicationRow) => void;
};

export function ApplicationsTable({ applications, onSelect }: Props) {
  return (
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
            applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  {new Date(app.created_at).toLocaleDateString("ja-JP", {
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
                    className="rounded-md border border-pink-400 px-4 py-1 text-sm font-medium text-pink-400 hover:bg-pink-50 transition-colors"
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
  );
}
