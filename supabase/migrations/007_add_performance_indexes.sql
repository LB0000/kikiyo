-- パフォーマンス改善: 複合インデックスの追加
-- getDashboardData / update_exchange_rate で頻出するフィルターパターンに対応

-- refunds: monthly_report_id + is_deleted の複合インデックス
-- 既存の idx_refunds_monthly_report (monthly_report_id のみ) より効率的
CREATE INDEX IF NOT EXISTS idx_refunds_report_active
  ON refunds(monthly_report_id, is_deleted);

-- csv_data: monthly_report_id + agency_id の複合インデックス
-- 代理店フィルター付きダッシュボード表示で使用
CREATE INDEX IF NOT EXISTS idx_csv_data_report_agency
  ON csv_data(monthly_report_id, agency_id);

-- monthly_reports: created_at DESC のインデックス
-- getMonthlyReports の ORDER BY に対応
CREATE INDEX IF NOT EXISTS idx_monthly_reports_created_desc
  ON monthly_reports(created_at DESC);
