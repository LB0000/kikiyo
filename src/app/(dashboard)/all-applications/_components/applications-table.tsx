"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUS_LABELS,
  FORM_TAB_LABELS,
} from "@/lib/constants";
import type { ApplicationRow } from "@/lib/actions/applications";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  applications: ApplicationRow[];
  onSelect: (app: ApplicationRow) => void;
};

const statusVariant: Record<ApplicationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  released: "secondary",
  authorized: "default",
  pending: "outline",
  rejected: "destructive",
};

export function ApplicationsTable({ applications, onSelect }: Props) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>申請種別</TableHead>
            <TableHead>氏名</TableHead>
            <TableHead>TikTokユーザー名</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>代理店</TableHead>
            <TableHead>申請日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground py-8"
              >
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            applications.map((app) => (
              <TableRow
                key={app.id}
                className="cursor-pointer"
                onClick={() => onSelect(app)}
              >
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {FORM_TAB_LABELS[app.form_tab]}
                  </Badge>
                </TableCell>
                <TableCell>{app.name ?? "-"}</TableCell>
                <TableCell>{app.tiktok_username ?? "-"}</TableCell>
                <TableCell className="text-sm">{app.email ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[app.status]}>
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </Badge>
                </TableCell>
                <TableCell>{app.agency_name ?? "-"}</TableCell>
                <TableCell>
                  {new Date(app.created_at).toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
