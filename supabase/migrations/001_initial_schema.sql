-- ============================================
-- TikTok Live Tool - Initial Database Schema
-- ============================================

-- Enums
CREATE TYPE user_role AS ENUM ('system_admin', 'agency_user');
CREATE TYPE application_status AS ENUM ('completed', 'released', 'authorized', 'pending', 'rejected');
CREATE TYPE agency_rank AS ENUM ('rank_2', 'rank_3', 'rank_4');
CREATE TYPE form_tab AS ENUM (
  'affiliation_check', 'million_special', 'streaming_auth',
  'subscription_cancel', 'account_id_change', 'event_build',
  'special_referral', 'objection'
);
CREATE TYPE revenue_task AS ENUM ('task_1', 'task_2', 'task_3', 'task_4', 'task_5', 'task_6_plus');

-- ============================================
-- Tables
-- ============================================

-- 代理店
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  rank agency_rank,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 代理店階層（多対多の自己参照）
CREATE TABLE agency_hierarchy (
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  parent_agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  PRIMARY KEY (agency_id, parent_agency_id)
);

-- ユーザープロファイル
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'agency_user',
  agency_id UUID REFERENCES agencies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザーの閲覧可能代理店
CREATE TABLE profile_viewable_agencies (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, agency_id)
);

-- ライバー
CREATE TABLE livers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  acquisition_date DATE,
  link TEXT,
  contact TEXT,
  birth_date DATE,
  streaming_start_date DATE,
  account_name TEXT,
  liver_id TEXT,
  email TEXT,
  tiktok_username TEXT,
  status application_status DEFAULT 'pending',
  agency_id UUID REFERENCES agencies(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ライバーと代理店の多対多
CREATE TABLE liver_agencies (
  liver_id UUID REFERENCES livers(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  PRIMARY KEY (liver_id, agency_id)
);

-- 月次レポート
CREATE TABLE monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate NUMERIC(10,2) NOT NULL,
  revenue_task revenue_task,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CSVデータ
CREATE TABLE csv_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id TEXT,
  creator_nickname TEXT,
  handle TEXT,
  "group" TEXT,
  group_manager TEXT,
  creator_network_manager TEXT,
  data_month TEXT,
  diamonds NUMERIC DEFAULT 0,
  estimated_bonus NUMERIC DEFAULT 0,
  bonus_rookie_half_milestone NUMERIC DEFAULT 0,
  bonus_activeness NUMERIC DEFAULT 0,
  bonus_revenue_scale NUMERIC DEFAULT 0,
  bonus_rookie_milestone_1 NUMERIC DEFAULT 0,
  bonus_rookie_milestone_2 NUMERIC DEFAULT 0,
  bonus_off_platform NUMERIC DEFAULT 0,
  bonus_rookie_retention NUMERIC DEFAULT 0,
  valid_days TEXT,
  live_duration TEXT,
  is_violative BOOLEAN DEFAULT false,
  was_rookie BOOLEAN DEFAULT false,
  total_reward_jpy NUMERIC DEFAULT 0,
  agency_reward_jpy NUMERIC DEFAULT 0,
  liver_id UUID REFERENCES livers(id),
  agency_id UUID REFERENCES agencies(id),
  monthly_report_id UUID REFERENCES monthly_reports(id),
  upload_agency_id UUID REFERENCES agencies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 返金
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_month DATE NOT NULL,
  reason TEXT,
  amount_usd NUMERIC NOT NULL,
  amount_jpy NUMERIC NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  agency_id UUID REFERENCES agencies(id),
  liver_id UUID REFERENCES livers(id),
  monthly_report_id UUID REFERENCES monthly_reports(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 申請
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  birth_date DATE,
  contact TEXT,
  email TEXT,
  additional_info TEXT,
  tiktok_username TEXT,
  tiktok_account_link TEXT,
  id_verified BOOLEAN DEFAULT false,
  status application_status DEFAULT 'pending',
  form_tab form_tab NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  liver_id UUID REFERENCES livers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_livers_agency_id ON livers(agency_id);
CREATE INDEX idx_livers_liver_id ON livers(liver_id);
CREATE INDEX idx_csv_data_monthly_report ON csv_data(monthly_report_id);
CREATE INDEX idx_csv_data_creator_id ON csv_data(creator_id);
CREATE INDEX idx_csv_data_agency ON csv_data(agency_id);
CREATE INDEX idx_refunds_monthly_report ON refunds(monthly_report_id);
CREATE INDEX idx_refunds_agency ON refunds(agency_id);
CREATE INDEX idx_applications_agency ON applications(agency_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_viewable_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE livers ENABLE ROW LEVEL SECURITY;
ALTER TABLE liver_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Helper function: 現在のユーザーのロールを取得
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: 現在のユーザーの閲覧可能代理店IDを取得
CREATE OR REPLACE FUNCTION get_viewable_agency_ids()
RETURNS SETOF UUID AS $$
  SELECT agency_id FROM profile_viewable_agencies WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "自分のプロファイルは閲覧可能" ON profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "管理者は全プロファイル閲覧可能" ON profiles
  FOR SELECT USING (get_user_role() = 'system_admin');
CREATE POLICY "管理者は全プロファイル更新可能" ON profiles
  FOR ALL USING (get_user_role() = 'system_admin');

-- agencies
CREATE POLICY "管理者は全代理店にフルアクセス" ON agencies
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店のみ" ON agencies
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND id IN (SELECT get_viewable_agency_ids())
  );

-- agency_hierarchy
CREATE POLICY "管理者は全階層にフルアクセス" ON agency_hierarchy
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店の階層のみ" ON agency_hierarchy
  FOR SELECT USING (
    agency_id IN (SELECT get_viewable_agency_ids())
    OR parent_agency_id IN (SELECT get_viewable_agency_ids())
  );

-- profile_viewable_agencies
CREATE POLICY "管理者はフルアクセス" ON profile_viewable_agencies
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "自分の閲覧可能代理店は閲覧可能" ON profile_viewable_agencies
  FOR SELECT USING (profile_id = auth.uid());

-- livers
CREATE POLICY "管理者は全ライバーにフルアクセス" ON livers
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店のライバーのみ" ON livers
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );
CREATE POLICY "代理店ユーザーはライバー更新可能" ON livers
  FOR UPDATE USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- liver_agencies
CREATE POLICY "管理者はフルアクセス" ON liver_agencies
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能" ON liver_agencies
  FOR SELECT USING (
    agency_id IN (SELECT get_viewable_agency_ids())
  );

-- monthly_reports
CREATE POLICY "認証済みユーザーは全レポート閲覧可能" ON monthly_reports
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "認証済みユーザーはレポート作成可能" ON monthly_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "管理者はレポート更新可能" ON monthly_reports
  FOR UPDATE USING (get_user_role() = 'system_admin');

-- csv_data
CREATE POLICY "管理者は全CSVにフルアクセス" ON csv_data
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店のCSVのみ" ON csv_data
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND (agency_id IN (SELECT get_viewable_agency_ids())
         OR upload_agency_id IN (SELECT get_viewable_agency_ids()))
  );
CREATE POLICY "代理店ユーザーはCSV挿入可能" ON csv_data
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- refunds
CREATE POLICY "管理者は全返金にフルアクセス" ON refunds
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店の返金のみ" ON refunds
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- applications
CREATE POLICY "管理者は全申請にフルアクセス" ON applications
  FOR ALL USING (get_user_role() = 'system_admin');
CREATE POLICY "代理店ユーザーは閲覧可能代理店の申請のみ" ON applications
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );
CREATE POLICY "代理店ユーザーは申請作成可能" ON applications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Stored Procedure: 為替レート一括更新
-- ============================================
CREATE OR REPLACE FUNCTION update_exchange_rate(
  p_monthly_report_id UUID,
  p_new_rate NUMERIC
)
RETURNS void AS $$
BEGIN
  -- MonthlyReportのrate更新
  UPDATE monthly_reports SET rate = p_new_rate WHERE id = p_monthly_report_id;

  -- CSVデータの円額再計算（通貨精度のためROUND使用）
  UPDATE csv_data
  SET
    total_reward_jpy = ROUND(estimated_bonus * p_new_rate, 2),
    agency_reward_jpy = ROUND(estimated_bonus * p_new_rate * COALESCE(
      (SELECT commission_rate FROM agencies WHERE agencies.id = csv_data.agency_id), 0
    ), 2)
  WHERE monthly_report_id = p_monthly_report_id;

  -- 返金データの円額再計算
  UPDATE refunds
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger: profilesテーブル自動作成
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'agency_user'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Trigger: updated_at自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_agencies
  BEFORE UPDATE ON agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_livers
  BEFORE UPDATE ON livers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_applications
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
