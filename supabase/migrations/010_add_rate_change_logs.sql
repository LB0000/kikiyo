-- 為替レート変更履歴テーブル
CREATE TABLE rate_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id UUID NOT NULL REFERENCES monthly_reports(id),
  old_rate NUMERIC(10,2) NOT NULL,
  new_rate NUMERIC(10,2) NOT NULL,
  affected_csv_rows INTEGER NOT NULL DEFAULT 0,
  affected_refund_rows INTEGER NOT NULL DEFAULT 0,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_rate_change_logs_report ON rate_change_logs(monthly_report_id);

-- RLS
ALTER TABLE rate_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_admin can manage rate_change_logs"
  ON rate_change_logs
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin');
