-- ============================================
-- 分配明細（distributions）— 確定スナップショット
-- ============================================
-- 要望#4 / 4-A（docs/4A_data_model_design.md）。
-- マネージャー/スカウト分は請求書PDFを発行せず、この明細を画面表示する。
-- invoices には一切触れない（代理店請求は従来通り UNIQUE(agency_id, monthly_report_id)）。
-- 計算時点の率・元本をスナップショットで固定（invoices と同思想・確定後は遡及しない）。
-- 4-B（多段分配計算）が DELETE+INSERT でこのテーブルを生成する。

CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  monthly_report_id UUID NOT NULL REFERENCES monthly_reports(id) ON DELETE CASCADE,

  -- 分配元スコープ（どの代理店の取り分からの分配か）。
  -- NULL 可: total_side（全額受領の起点）など、特定の元代理店に紐づかない集計を許容する。
  source_agency_id UUID REFERENCES agencies(id),

  -- 分配先（排他的アーク）。参照先が消えても明細は残す方針のため FK は既定の RESTRICT。
  payee_kind payee_kind NOT NULL,
  manager_id UUID REFERENCES managers(id),
  scout_id UUID REFERENCES scouts(id),
  payee_agency_id UUID REFERENCES agencies(id),

  -- 金額スナップショット
  base_amount_jpy NUMERIC NOT NULL,        -- 分配計算の元になった金額（円）
  applied_rate NUMERIC(5,4) NOT NULL CHECK (applied_rate >= 0 AND applied_rate <= 1), -- 適用した分配率（スナップショット）
  amount_jpy NUMERIC NOT NULL,             -- 分配額（円） = ROUND(base_amount_jpy × applied_rate, 2)

  -- 分配段数（1=一次, 2=三次代理店段 など）
  tier INT NOT NULL DEFAULT 1 CHECK (tier >= 1),
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_dist_payee CHECK (
    (payee_kind = 'manager'    AND manager_id IS NOT NULL AND scout_id IS NULL AND payee_agency_id IS NULL) OR
    (payee_kind = 'scout'      AND scout_id IS NOT NULL AND manager_id IS NULL AND payee_agency_id IS NULL) OR
    (payee_kind = 'agency'     AND payee_agency_id IS NOT NULL AND manager_id IS NULL AND scout_id IS NULL) OR
    (payee_kind = 'total_side' AND manager_id IS NULL AND scout_id IS NULL AND payee_agency_id IS NULL)
  )
);

CREATE INDEX idx_distributions_report ON distributions(monthly_report_id);
CREATE INDEX idx_distributions_source_agency ON distributions(source_agency_id) WHERE source_agency_id IS NOT NULL;
CREATE INDEX idx_distributions_manager ON distributions(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_distributions_scout ON distributions(scout_id) WHERE scout_id IS NOT NULL;
CREATE INDEX idx_distributions_payee_agency ON distributions(payee_agency_id) WHERE payee_agency_id IS NOT NULL;

-- ============================================
-- Row Level Security（管理者ポリシーのみ。マネージャー/スカウト向けは 037 で追加）
-- ============================================
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者は全分配明細にフルアクセス" ON distributions
  FOR ALL USING (get_user_role() = 'system_admin');
