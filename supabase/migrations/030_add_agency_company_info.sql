-- ============================================
-- 代理店: 会社名／契約者氏名を追加
-- ============================================
-- 要望#1 対応。
-- agencies.name は Backstage グループ名（例: kikiyo@onishi / KOOL / ききよ）で
-- 登録されており、CSV の creator_network_manager との突き合わせキーとして使用中。
-- 請求書に出す会社名（例: KIKIYO合同会社）は別枠で持たせる必要があるため、
-- agencies.company_name / agencies.contract_person_name を新設する。
--
-- 請求書はスナップショット方式（発行時点の情報を invoices に複製保存）のため、
-- invoices 側にも対応するスナップショット列を追加する。

-- ============================================
-- agencies テーブル
-- ============================================
ALTER TABLE agencies ADD COLUMN company_name TEXT;
ALTER TABLE agencies ADD COLUMN contract_person_name TEXT;

COMMENT ON COLUMN agencies.name IS 'Backstage グループ名（kikiyo@onishi 等）— CSV紐付けキー';
COMMENT ON COLUMN agencies.company_name IS '請求書宛名用の会社名（KIKIYO合同会社 等）。空の場合は name を代替使用';
COMMENT ON COLUMN agencies.contract_person_name IS '契約者氏名。請求書に表示';

-- ============================================
-- invoices テーブル（スナップショット）
-- ============================================
ALTER TABLE invoices ADD COLUMN agency_company_name TEXT;
ALTER TABLE invoices ADD COLUMN agency_contract_person_name TEXT;

COMMENT ON COLUMN invoices.agency_company_name IS '発行時点の会社名スナップショット';
COMMENT ON COLUMN invoices.agency_contract_person_name IS '発行時点の契約者氏名スナップショット';
