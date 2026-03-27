-- ============================================
-- Remove million_special from form_tab enum
-- ============================================
-- 既存データ: 0件（確認済み）
-- PostgreSQL ENUM値の削除は直接できないため、再作成する

-- 1. 新しいENUM型を作成
CREATE TYPE form_tab_new AS ENUM (
  'affiliation_check', 'streaming_auth',
  'subscription_cancel', 'account_id_change', 'event_build',
  'special_referral', 'objection'
);

-- 2. applications テーブルのカラムを変換
ALTER TABLE applications
  ALTER COLUMN form_tab TYPE form_tab_new
  USING form_tab::text::form_tab_new;

-- 3. 旧ENUM型を削除し、新ENUM型をリネーム
DROP TYPE form_tab;
ALTER TYPE form_tab_new RENAME TO form_tab;
