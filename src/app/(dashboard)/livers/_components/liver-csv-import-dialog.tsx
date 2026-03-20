"use client";

import { useState, useRef } from "react";
import { Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { importLiversCsv } from "@/lib/actions/livers";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function LiverCsvImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!file) {
      toast.error("CSVファイルを選択してください");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("ファイルサイズが大きすぎます（上限5MB）");
      return;
    }

    setLoading(true);

    try {
      setUploadStage("CSVファイルを読み込み中...");
      const arrayBuffer = await file.arrayBuffer();
      const utf8Text = new TextDecoder("utf-8").decode(arrayBuffer);
      const csvText = utf8Text.includes("\uFFFD")
        ? new TextDecoder("shift-jis").decode(arrayBuffer)
        : utf8Text;

      setUploadStage("データを検証・登録中...");
      const result = await importLiversCsv(csvText);

      if ("error" in result) {
        toast.error("インポートに失敗しました", {
          description: result.error,
        });
      } else {
        const parts: string[] = [];
        if (result.updatedCount > 0) parts.push(`更新: ${result.updatedCount}件`);
        if (result.createdCount > 0) parts.push(`新規作成: ${result.createdCount}件`);
        if (result.skippedCount > 0) parts.push(`スキップ: ${result.skippedCount}件`);

        if (result.errors.length > 0) {
          toast.warning("CSVインポートが完了しました", {
            description: [
              ...parts,
              `エラー: ${result.errors.length}件`,
            ].join(" / "),
          });
        } else {
          toast.success("CSVインポートが完了しました", {
            description: parts.join(" / ") || "変更はありません",
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
      setUploadStage(null);
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg gap-5">
        <DialogHeader>
          <DialogTitle>ライバー名簿CSVインポート</DialogTitle>
          <DialogDescription>
            エクスポートしたCSVを編集して再インポートできます。TikTokユーザー名で既存ライバーとマッチングします。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="liver-csv-file">CSVファイル</Label>
          <Input
            id="liver-csv-file"
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
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
          <Button onClick={handleImport} disabled={loading || !file}>
            {loading ? "インポート中..." : "インポート"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
