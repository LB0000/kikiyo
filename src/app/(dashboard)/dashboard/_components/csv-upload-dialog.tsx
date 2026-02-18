"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { REVENUE_TASK_LABELS } from "@/lib/constants";
import { importCsvData } from "@/lib/actions/dashboard";
import type { RevenueTask } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadAgencyId: string | null;
};

export function CsvUploadDialog({ open, onOpenChange, uploadAgencyId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(150);
  const [revenueTask, setRevenueTask] = useState<RevenueTask>("task_1");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFile(null);
    setExchangeRate(150);
    setRevenueTask("task_1");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  async function handleUpload() {
    if (!file) {
      toast.error("CSVファイルを選択してください");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("ファイルサイズが大きすぎます（上限5MB）");
      return;
    }

    if (exchangeRate < 50 || exchangeRate > 500) {
      toast.error("為替レートは50〜500の範囲で入力してください");
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();

      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        toast.error("CSVの解析に失敗しました", {
          description: parsed.errors[0]?.message,
        });
        setLoading(false);
        return;
      }

      if (parsed.data.length === 0) {
        toast.error("CSVにデータがありません");
        setLoading(false);
        return;
      }

      // 必須カラムの検証
      const firstRow = parsed.data[0];
      const hasCreatorId =
        "Creator ID" in firstRow || "creator_id" in firstRow;
      const hasEstimatedBonus =
        "Estimated Bonus" in firstRow || "estimated_bonus" in firstRow;
      if (!hasCreatorId || !hasEstimatedBonus) {
        toast.error("CSVに必須カラムが不足しています", {
          description: "Creator ID, Estimated Bonus が必要です",
        });
        setLoading(false);
        return;
      }

      // Map CSV rows to CsvRow type
      const safeFloat = (v: string | undefined) => {
        const n = parseFloat(v ?? "0");
        return isNaN(n) ? 0 : n;
      };

      const rows = parsed.data.map((row) => ({
        creator_id: row["Creator ID"] ?? row["creator_id"] ?? "",
        creator_nickname:
          row["Creator Nickname"] ?? row["creator_nickname"] ?? "",
        handle: row["Handle"] ?? row["handle"] ?? "",
        group: row["Group"] ?? row["group"] ?? "",
        group_manager: row["Group Manager"] ?? row["group_manager"] ?? "",
        creator_network_manager:
          row["Creator Network Manager"] ??
          row["creator_network_manager"] ??
          "",
        data_month: row["Data Month"] ?? row["data_month"] ?? "",
        diamonds: safeFloat(row["Diamonds"] ?? row["diamonds"]),
        estimated_bonus: safeFloat(
          row["Estimated Bonus"] ?? row["estimated_bonus"]
        ),
        valid_days: row["Valid Days"] ?? row["valid_days"] ?? "",
        live_duration: row["Live Duration"] ?? row["live_duration"] ?? "",
        is_violative_creators:
          (
            row["Is Violative Creators"] ??
            row["is_violative_creators"] ??
            "false"
          ).toLowerCase() === "true",
        the_creator_was_rookie_at_the_time_of_first_joining:
          (
            row[
              "The Creator Was Rookie At The Time Of First Joining"
            ] ??
            row[
              "the_creator_was_rookie_at_the_time_of_first_joining"
            ] ??
            "false"
          ).toLowerCase() === "true",
        // Bubble task1〜task6+ に対応するボーナスフィールド（CLAUDE.md参照）
        bonus_rookie_half_milestone: safeFloat(
          row["Bonus - Rookie Half Milestone"] ??
            row["bonus_rookie_half_milestone"]
        ),
        bonus_activeness: safeFloat(
          row["Bonus - Activeness"] ?? row["bonus_activeness"]
        ),
        bonus_revenue_scale: safeFloat(
          row["Bonus - Revenue Scale"] ?? row["bonus_revenue_scale"]
        ),
        bonus_rookie_milestone_1: safeFloat(
          row["Bonus - Rookie Milestone 1"] ??
            row["bonus_rookie_milestone_1"]
        ),
        bonus_rookie_milestone_2: safeFloat(
          row["Bonus - Rookie Milestone 2"] ??
            row["bonus_rookie_milestone_2"]
        ),
        bonus_off_platform: safeFloat(
          row["Bonus - Off Platform"] ?? row["bonus_off_platform"]
        ),
        bonus_rookie_retention: safeFloat(
          row["Bonus - Rookie Retention"] ??
            row["bonus_rookie_retention"]
        ),
      }));

      const result = await importCsvData({
        rows,
        rate: exchangeRate,
        revenueTask,
        uploadAgencyId: uploadAgencyId ?? "",
      });

      if ("error" in result) {
        toast.error("アップロードに失敗しました", {
          description: result.error,
        });
      } else {
        const hasUnlinked =
          result.unlinkedLiverCount > 0 || result.unlinkedAgencyCount > 0;
        const parts: string[] = [
          `${result.totalRows}件のデータを登録しました`,
        ];
        if (result.unlinkedLiverCount > 0) {
          parts.push(
            `ライバー未紐付け: ${result.unlinkedLiverCount}件`
          );
        }
        if (result.unlinkedAgencyCount > 0) {
          parts.push(
            `代理店未紐付け: ${result.unlinkedAgencyCount}件`
          );
        }

        if (hasUnlinked) {
          toast.warning("CSVデータをインポートしました", {
            description: parts.join(" / "),
          });
        } else {
          toast.success("CSVデータをインポートしました", {
            description: parts[0],
          });
        }
        resetForm();
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("エラーが発生しました", {
        description: err instanceof Error ? err.message : "不明なエラー",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>CSVアップロード</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSVファイル</Label>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchange-rate">為替レート (JPY/USD)</Label>
            <Input
              id="exchange-rate"
              type="number"
              step="0.01"
              min="0"
              value={exchangeRate}
              onChange={(e) =>
                setExchangeRate(parseFloat(e.target.value) || 0)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenue-task">収益タスク</Label>
            <Select
              value={revenueTask}
              onValueChange={(v) => setRevenueTask(v as RevenueTask)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="タスクを選択" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REVENUE_TASK_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button onClick={handleUpload} disabled={loading || !file}>
            {loading ? "アップロード中..." : "アップロード"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
