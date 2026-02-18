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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { STATUS_DOT_COLORS } from "@/components/shared/status-badge";
import { updateLiverStatus } from "@/lib/actions/livers";
import { toast } from "sonner";
import type { LiverRow } from "@/lib/actions/livers";
import type { ApplicationStatus } from "@/lib/supabase/types";

type Props = {
  livers: LiverRow[];
  onSelect: (liver: LiverRow) => void;
};

const PAGE_SIZE = 10;

export function LiversTable({ livers, onSelect }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(livers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedLivers = livers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleStatusChange(liverId: string, newStatus: ApplicationStatus, currentStatus: ApplicationStatus) {
    setUpdatingId(liverId);

    const result = await updateLiverStatus(liverId, newStatus);
    setUpdatingId(null);

    if (result.error) {
      toast.error("ステータス変更に失敗しました");
      return;
    }

    toast.success("申請状況を変更しました", {
      action: {
        label: "元に戻す",
        onClick: async () => {
          const undo = await updateLiverStatus(liverId, currentStatus);
          if (undo.error) {
            toast.error("元に戻せませんでした");
          } else {
            toast.success("ステータスを元に戻しました");
          }
        },
      },
      duration: 5000,
    });
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ライバー氏名</TableHead>
              <TableHead>ライバーID</TableHead>
              <TableHead>アカウント名</TableHead>
              <TableHead>申請状況</TableHead>
              <TableHead>配信開始日</TableHead>
              <TableHead>獲得日</TableHead>
              <TableHead>リンク</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {livers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  データがありません
                </TableCell>
              </TableRow>
            ) : (
              pagedLivers.map((liver) => (
                <TableRow
                  key={liver.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onSelect(liver)}
                >
                  <TableCell className="font-medium">
                    {liver.name ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {liver.liver_id ?? "-"}
                  </TableCell>
                  <TableCell>{liver.account_name ?? "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={liver.status}
                      onValueChange={(v) =>
                        handleStatusChange(liver.id, v as ApplicationStatus, liver.status as ApplicationStatus)
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
                              <span className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${STATUS_DOT_COLORS[value as ApplicationStatus]}`} />
                                {label}
                              </span>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">
                    {liver.streaming_start_date
                      ? new Date(liver.streaming_start_date).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {liver.acquisition_date
                      ? new Date(liver.acquisition_date).toLocaleDateString("ja-JP")
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate" onClick={(e) => e.stopPropagation()}>
                    {liver.link && /^https?:\/\//.test(liver.link) ? (
                      <a
                        href={liver.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title={liver.link}
                      >
                        {liver.link}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="cursor-pointer p-2.5 -m-1.5 text-primary hover:text-primary/70 transition-colors"
                      onClick={() => onSelect(liver)}
                      aria-label="編集"
                    >
                      <Pencil className="size-4" />
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
