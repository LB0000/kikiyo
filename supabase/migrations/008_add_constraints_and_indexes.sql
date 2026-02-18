-- ============================================
-- CHECK制約: データ整合性の強化
-- ============================================

-- 代理店: 手数料率は0〜1の範囲
ALTER TABLE agencies ADD CONSTRAINT check_commission_rate
  CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- 月次レポート: 為替レートは正の数
ALTER TABLE monthly_reports ADD CONSTRAINT check_rate_positive
  CHECK (rate > 0);

-- 返金: USD/JPY金額は正の数
ALTER TABLE refunds ADD CONSTRAINT check_positive_amounts
  CHECK (amount_usd > 0 AND amount_jpy > 0);

-- ============================================
-- FKインデックス: RLSサブクエリ高速化
-- ============================================

-- get_viewable_agency_ids() が全RLSポリシーで呼ばれる
CREATE INDEX IF NOT EXISTS idx_profile_viewable_agencies_profile
  ON profile_viewable_agencies(profile_id);

-- agencies.user_id の検索（代理店作成・ユーザー紐付け時）
CREATE INDEX IF NOT EXISTS idx_agencies_user_id
  ON agencies(user_id);

-- profiles.agency_id の検索
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id
  ON profiles(agency_id);

-- agency_hierarchy の親検索（閲覧権限同期トリガーで使用）
CREATE INDEX IF NOT EXISTS idx_agency_hierarchy_parent
  ON agency_hierarchy(parent_agency_id);
