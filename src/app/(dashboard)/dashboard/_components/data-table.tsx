"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CsvDataRow = {
  id: string;
  creator_nickname: string | null;
  handle: string | null;
  creator_id: string | null;
  diamonds: number;
  estimated_bonus: number;
  total_reward_jpy: number;
  agency_reward_jpy: number;
  data_month: string | null;
  live_duration: string | null;
  valid_days: string | null;
};

type Props = {
  rows: CsvDataRow[];
};

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function fmtJpy(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}`;
}

export function DataTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Creator Nickname</TableHead>
            <TableHead>Handle</TableHead>
            <TableHead>Creator ID</TableHead>
            <TableHead className="text-right">Diamonds</TableHead>
            <TableHead className="text-right">Estimated Bonus</TableHead>
            <TableHead className="text-right">Total Reward (JPY)</TableHead>
            <TableHead className="text-right">Agency Reward (JPY)</TableHead>
            <TableHead>Data Month</TableHead>
            <TableHead>Live Duration</TableHead>
            <TableHead>Valid Days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.creator_nickname ?? "-"}</TableCell>
              <TableCell>{row.handle ?? "-"}</TableCell>
              <TableCell className="font-mono text-xs">
                {row.creator_id ?? "-"}
              </TableCell>
              <TableCell className="text-right">{fmt(row.diamonds)}</TableCell>
              <TableCell className="text-right">
                {fmt(row.estimated_bonus)}
              </TableCell>
              <TableCell className="text-right">
                {fmtJpy(row.total_reward_jpy)}
              </TableCell>
              <TableCell className="text-right">
                {fmtJpy(row.agency_reward_jpy)}
              </TableCell>
              <TableCell>{row.data_month ?? "-"}</TableCell>
              <TableCell>{row.live_duration ?? "-"}</TableCell>
              <TableCell>{row.valid_days ?? "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
