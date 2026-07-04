-- ============================================
-- マネージャー / スカウト エンティティ + 分配先種別 enum
-- ============================================
-- 要望#4 / 4-A データモデル（docs/4A_data_model_design.md 案B）。
-- 代理店・三次代理店は既存 agencies + agency_hierarchy を再利用するため、
-- ここでは managers / scouts のみ新設する。
-- account_type enum（012）、update_updated_at()（001）を再利用。

-- 分配先種別（distribution_rules / distributions の排他的アークで使用）
CREATE TYPE payee_kind AS ENUM ('total_side', 'manager', 'agency', 'scout');

-- ============================================
-- managers: マネージャー
-- ============================================
CREATE TABLE managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                         -- マネージャー表示名
  backstage_group_manager TEXT,              -- csv_data.group_manager とのマッチキー（任意）
  user_id UUID REFERENCES auth.users(id),    -- 代表者ログインアカウント（1:1, manager_user）
  -- 口座/インボイス情報（マネージャー分はPDF発行しないが将来用に保持・NULL許容）
  company_name TEXT,
  representative_name TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false, -- soft delete（agencies と同思想）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 代表者は1アカウント = user_id は一意（NULL は除外）
CREATE UNIQUE INDEX uq_managers_user_id ON managers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_managers_is_deleted ON managers(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_managers_group_manager ON managers(LOWER(backstage_group_manager));

-- ============================================
-- scouts: スカウト
-- ============================================
CREATE TABLE scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),    -- スカウトログイン（1:1, scout_user）。NULL=ログインなし
  -- スカウト請求はトータルサイドに集約するため口座は任意
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_type account_type,            -- 012 で定義済み enum を再利用
  bank_account_number TEXT,
  bank_account_holder TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX uq_scouts_user_id ON scouts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_scouts_is_deleted ON scouts(is_deleted) WHERE is_deleted = false;

-- ============================================
-- updated_at トリガ（001 の update_updated_at() を再利用）
-- ============================================
CREATE TRIGGER set_updated_at_managers
  BEFORE UPDATE ON managers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_scouts
  BEFORE UPDATE ON scouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Row Level Security（作成時に有効化 = deny-by-default）
-- manager_user / scout_user 向けの閲覧ポリシーは 037 で追加する。
-- ここでは管理者ポリシーのみ（既存 get_user_role() を使用）。
-- ============================================
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者は全マネージャーにフルアクセス" ON managers
  FOR ALL USING (get_user_role() = 'system_admin');

CREATE POLICY "管理者は全スカウトにフルアクセス" ON scouts
  FOR ALL USING (get_user_role() = 'system_admin');
