-- ============================================
-- monthly_reports に DELETE ポリシー追加
-- ============================================
-- 管理者がレポートを削除可能にする。
-- これにより、CSVインポートエラー時の既存クリーンアップロジックも正常に動作する。

CREATE POLICY "管理者はレポート削除可能" ON monthly_reports
  FOR DELETE USING (get_user_role() = 'system_admin');
