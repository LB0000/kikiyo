-- ============================================
-- 分配ルール（率マスタ）
-- ============================================
-- 要望#4 / 4-A（docs/4A_data_model_design.md）。
-- 「どの代理店スコープから、どの分配先（payee_kind）へ、どの率で分配するか」を保持。
-- 固定マスタ方式（案②）: 現在値のみ保持し、変更履歴は distribution_rule_change_logs。
-- 既存 agencies.commission_rate（代理店自身の取り分）は維持し、本テーブルは
-- マネージャー/スカウト/三次代理店/トータルサイドへの「追加分配率」を表現する。
-- 分配先は排他的アーク（payee_kind と一致する FK だけ NOT NULL）。

CREATE TABLE distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 適用スコープ（どの代理店配下の分配か）
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- 分配先（排他的アーク）
  payee_kind payee_kind NOT NULL,
  manager_id UUID REFERENCES managers(id),
  scout_id UUID REFERENCES scouts(id),
  payee_agency_id UUID REFERENCES agencies(id),   -- 三次代理店（自分以外の agency）

  -- 率（agencies.commission_rate / invoices.commission_rate と同精度）。0〜1 の割合。
  rate NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (rate >= 0 AND rate <= 1),

  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT chk_dr_payee CHECK (
    (payee_kind = 'manager'    AND manager_id IS NOT NULL AND scout_id IS NULL AND payee_agency_id IS NULL) OR
    (payee_kind = 'scout'      AND scout_id IS NOT NULL AND manager_id IS NULL AND payee_agency_id IS NULL) OR
    (payee_kind = 'agency'     AND payee_agency_id IS NOT NULL AND manager_id IS NULL AND scout_id IS NULL) OR
    (payee_kind = 'total_side' AND manager_id IS NULL AND scout_id IS NULL AND payee_agency_id IS NULL)
  )
);

-- 同一スコープ×同一payeeのアクティブな率は1つだけ（is_deleted=false に限定）。
-- NULL を含む複合一意のため COALESCE でセンチネル UUID（ゼロUUID）に正規化する。
-- ゼロUUID は gen_random_uuid() が生成しない予約値であり、実エンティティIDと衝突しない。
-- （PG15+ なら NULLS NOT DISTINCT で代替可能だが、互換性のためセンチネル方式を採用）
CREATE UNIQUE INDEX uq_distribution_rules_active
  ON distribution_rules(
       agency_id,
       payee_kind,
       COALESCE(manager_id, '00000000-0000-0000-0000-000000000000'),
       COALESCE(scout_id, '00000000-0000-0000-0000-000000000000'),
       COALESCE(payee_agency_id, '00000000-0000-0000-0000-000000000000')
     )
  WHERE is_deleted = false;
CREATE INDEX idx_distribution_rules_agency ON distribution_rules(agency_id) WHERE is_deleted = false;

-- ============================================
-- 率変更履歴
-- ============================================
CREATE TABLE distribution_rule_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_rule_id UUID NOT NULL REFERENCES distribution_rules(id) ON DELETE CASCADE,
  old_rate NUMERIC(5,4),
  new_rate NUMERIC(5,4) NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_distribution_rule_change_logs_rule ON distribution_rule_change_logs(distribution_rule_id);

CREATE TRIGGER set_updated_at_distribution_rules
  BEFORE UPDATE ON distribution_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security（管理者ポリシーのみ。担当者向けは 037 で追加）
-- ============================================
ALTER TABLE distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_rule_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者は全分配ルールにフルアクセス" ON distribution_rules
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "管理者は率変更履歴にフルアクセス" ON distribution_rule_change_logs
  FOR ALL USING (get_user_role() = 'system_admin');
