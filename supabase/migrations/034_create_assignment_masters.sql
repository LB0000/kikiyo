-- ============================================
-- 紐付けマスタ: マネージャー↔代理店 / スカウト↔代理店 / ライバー↔スカウト
-- ============================================
-- 要望#4 / 4-A（docs/4A_data_model_design.md 案②: 固定マスタ＝現在値上書き＋change_log）。
-- 紐付けは「変更があるまで固定」。確定値は distributions のスナップショットが保持し、
-- 変更履歴は assignment_change_logs に残す（rate_change_logs(010) と同思想）。

-- ============================================
-- manager_agencies: 1代理店 = 1マネージャー（三次代理店も agencies 行なので同表に乗る）
-- ============================================
CREATE TABLE manager_agencies (
  agency_id UUID PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_manager_agencies_manager ON manager_agencies(manager_id);

-- ============================================
-- scout_agencies: スカウト↔代理店（代理店とスカウトは別計算のため独立紐付け）
-- ============================================
CREATE TABLE scout_agencies (
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (scout_id, agency_id)
);
CREATE INDEX idx_scout_agencies_agency ON scout_agencies(agency_id);

-- ============================================
-- liver_scouts: ライバー↔スカウト（任意）
-- スカウト報酬の計算単位（ライバー獲得ベース or 代理店経由）は 4-B で確定。
-- 本テーブルは「ライバー獲得ベース」を採る場合のパス。未採用なら未使用で害は小さい。
-- ============================================
CREATE TABLE liver_scouts (
  liver_id UUID PRIMARY KEY REFERENCES livers(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()  -- scout_id を上書き変更しうる（manager_agencies と対称）
);
CREATE INDEX idx_liver_scouts_scout ON liver_scouts(scout_id);

-- ============================================
-- assignment_change_logs: 紐付け変更履歴
-- ============================================
CREATE TABLE assignment_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('manager_agency', 'scout_agency', 'liver_scout')),
  target_id UUID NOT NULL,          -- 変更対象（agency_id / liver_id 等）
  old_value UUID,                   -- 旧 manager_id / scout_id
  new_value UUID,                   -- 新 manager_id / scout_id
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_assignment_change_logs_target ON assignment_change_logs(target_id);

-- ============================================
-- updated_at トリガ
-- ============================================
CREATE TRIGGER set_updated_at_manager_agencies
  BEFORE UPDATE ON manager_agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_liver_scouts
  BEFORE UPDATE ON liver_scouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security（管理者ポリシーのみ。担当者向けは 037 で追加）
-- ============================================
ALTER TABLE manager_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE liver_scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者はフルアクセス" ON manager_agencies
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "管理者はフルアクセス" ON scout_agencies
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "管理者はフルアクセス" ON liver_scouts
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "管理者はフルアクセス" ON assignment_change_logs
  FOR ALL USING (get_user_role() = 'system_admin');
