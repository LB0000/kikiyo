"use client";

import { useState, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { ImportConfirmation } from "@/lib/actions/dashboard";
import type { RevenueTask } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadAgencyId: string | null;
};

type ConfirmState = {
  confirmation: ImportConfirmation;
  csvText: string;
};

export function CsvUploadDialog({ open, onOpenChange, uploadAgencyId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(150);
  const [revenueTask, setRevenueTask] = useState<RevenueTask>("task_1");
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFile(null);
    setExchangeRate(150);
    setRevenueTask("task_1");
    setConfirmState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  function handleImportSuccess(result: { success: true; totalRows: number; unlinkedLiverCount: number; unlinkedAgencyCount: number; linkedLiverCount: number; linkedAgencyCount: number; newLiverCount: number }) {
    const hasUnlinked =
      result.unlinkedLiverCount > 0 || result.unlinkedAgencyCount > 0;
    const parts: string[] = [
      `${result.totalRows}件のデータを登録しました`,
    ];
    if (result.newLiverCount > 0) {
      parts.push(`新規ライバー自動登録: ${result.newLiverCount}件`);
    }
    if (result.unlinkedLiverCount > 0) {
      parts.push(`ライバー未紐付け: ${result.unlinkedLiverCount}件`);
    }
    if (result.unlinkedAgencyCount > 0) {
      parts.push(`代理店未紐付け: ${result.unlinkedAgencyCount}件`);
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
      setUploadStage("CSVファイルを読み込み中...");
      const csvText = await file.text();

      setUploadStage("データを検証・登録中...");
      const result = await importCsvData({
        csvText,
        rate: exchangeRate,
        revenueTask,
        uploadAgencyId: uploadAgencyId ?? "",
      });

      if ("error" in result) {
        toast.error("アップロードに失敗しました", {
          description: result.error,
        });
      } else if ("needsConfirmation" in result) {
        // 同月データが存在 → 上書き確認を表示
        setConfirmState({ confirmation: result, csvText });
      } else {
        handleImportSuccess(result);
      }
    } catch (err) {
      toast.error("エラーが発生しました", {
        description: err instanceof Error ? err.message : "不明なエラー",
      });
    } finally {
      setUploadStage(null);
      setLoading(false);
    }
  }

  async function handleReplace() {
    if (!confirmState) return;

    setLoading(true);

    try {
      setUploadStage("既存データを上書き中...");
      const result = await importCsvData({
        csvText: confirmState.csvText,
        rate: exchangeRate,
        revenueTask,
        uploadAgencyId: uploadAgencyId ?? "",
        replaceReportIds: confirmState.confirmation.existingReports.map((r) => r.id),
      });

      if ("error" in result) {
        toast.error("上書きに失敗しました", {
          description: result.error,
        });
      } else if ("needsConfirmation" in result) {
        // 通常到達しないが安全のため
        toast.error("予期しないエラーが発生しました");
      } else {
        handleImportSuccess(result);
      }
    } catch (err) {
      toast.error("エラーが発生しました", {
        description: err instanceof Error ? err.message : "不明なエラー",
      });
    } finally {
      setUploadStage(null);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { setConfirmState(null); onOpenChange(v); } }}>
      <DialogContent className="max-w-lg gap-5">
        <DialogHeader>
          <DialogTitle>CSVアップロード</DialogTitle>
          <DialogDescription>月次レポートのCSVファイルを登録します</DialogDescription>
        </DialogHeader>

        {confirmState ? (
          // 上書き確認画面
          <>
            <div className="flex items-start gap-3.5 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {confirmState.confirmation.dataMonth} のデータが既に登録されています
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  既存のCSVデータを削除し、新しいデータで上書きします。返金データは引き継がれます。
                </p>
              </div>
            </div>

            {uploadStage && (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>{uploadStage}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmState(null)}
                disabled={loading}
              >
                戻る
              </Button>
              <Button
                variant="destructive"
                onClick={handleReplace}
                disabled={loading}
              >
                {loading ? "上書き中..." : "上書き"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // 通常のアップロードフォーム
          <>
            <div className="space-y-5">
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

            {uploadStage && (
              <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>{uploadStage}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button onClick={handleUpload} disabled={loading || !file}>
                {loading ? "アップロード中..." : "アップロード"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
