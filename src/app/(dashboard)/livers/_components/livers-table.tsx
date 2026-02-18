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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { updateLiverStatus } from "@/lib/actions/livers";
import { toast } from "sonner";
import type { LiverRow } from "@/lib/actions/livers";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  livers: LiverRow[];
  onSelect: (liver: LiverRow) => void;
};

export function LiversTable({ livers, onSelect }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(liverId: string, status: ApplicationStatus) {
    setUpdatingId(liverId);
    try {
      const result = await updateLiverStatus(liverId, status);
      if (result.error) {
        toast.error("ステータス変更に失敗しました");
      } else {
        toast.success("申請状況を変更しました");
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>氏名</TableHead>
            <TableHead>アカウント名</TableHead>
            <TableHead>ライバーID</TableHead>
            <TableHead>申請状況</TableHead>
            <TableHead>メールアドレス</TableHead>
            <TableHead>所属代理店</TableHead>
            <TableHead>リンク</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {livers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            livers.map((liver) => (
              <TableRow key={liver.id}>
                <TableCell
                  className="font-medium cursor-pointer hover:underline"
                  onClick={() => onSelect(liver)}
                >
                  {liver.name ?? "-"}
                </TableCell>
                <TableCell>{liver.account_name ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {liver.liver_id ?? "-"}
                </TableCell>
                <TableCell>
                  <Select
                    value={liver.status}
                    onValueChange={(v) =>
                      handleStatusChange(liver.id, v as ApplicationStatus)
                    }
                    disabled={updatingId === liver.id}
                  >
                    <SelectTrigger className="w-28 h-8" aria-label="申請状況を変更">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATION_STATUS_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm">
                  {liver.email ?? "-"}
                </TableCell>
                <TableCell>{liver.agency_name ?? "-"}</TableCell>
                <TableCell>
                  {liver.link && /^https?:\/\//.test(liver.link) ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      asChild
                    >
                      <a
                        href={liver.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        開く
                      </a>
                    </Button>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
