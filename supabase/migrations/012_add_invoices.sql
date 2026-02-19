-- ============================================
-- 請求書（インボイス）機能追加
-- ============================================

-- 口座種別 enum
CREATE TYPE account_type AS ENUM ('futsu', 'toza');

-- ============================================
-- agencies テーブルにインボイス関連カラム追加
-- ============================================
-- invoice_registration_number が NULL = インボイス制度未登録
ALTER TABLE agencies ADD COLUMN invoice_registration_number TEXT;
ALTER TABLE agencies ADD COLUMN company_address TEXT;
ALTER TABLE agencies ADD COLUMN representative_name TEXT;
ALTER TABLE agencies ADD COLUMN bank_name TEXT;
ALTER TABLE agencies ADD COLUMN bank_branch TEXT;
ALTER TABLE agencies ADD COLUMN bank_account_type account_type;
ALTER TABLE agencies ADD COLUMN bank_account_number TEXT;
ALTER TABLE agencies ADD COLUMN bank_account_holder TEXT;

-- インボイス登録番号の形式チェック（T + 数字13桁）
ALTER TABLE agencies ADD CONSTRAINT chk_invoice_registration_number
  CHECK (invoice_registration_number IS NULL OR invoice_registration_number ~ '^T[0-9]{13}$');

-- ============================================
-- 請求書テーブル
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 請求書番号（INV-YYYYMM-XXXX 形式）
  invoice_number TEXT NOT NULL UNIQUE,

  -- リレーション
  agency_id UUID NOT NULL REFERENCES agencies(id),
  monthly_report_id UUID NOT NULL REFERENCES monthly_reports(id),

  -- 金額スナップショット
  subtotal_jpy NUMERIC NOT NULL,
  tax_rate NUMERIC(5,4) NOT NULL,
  tax_amount_jpy NUMERIC NOT NULL,
  total_jpy NUMERIC NOT NULL,

  -- インボイス制度関連
  is_invoice_registered BOOLEAN NOT NULL DEFAULT false,
  invoice_registration_number TEXT,
  deductible_rate NUMERIC(3,2) NOT NULL DEFAULT 1.0,

  -- 代理店情報スナップショット（発行時点の情報を保持）
  agency_name TEXT NOT NULL,
  agency_address TEXT,
  agency_representative TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_type account_type,
  bank_account_number TEXT,
  bank_account_holder TEXT,

  -- レポート情報スナップショット
  data_month TEXT,
  exchange_rate NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,

  -- ステータス（NULL = 未送付）
  sent_at TIMESTAMPTZ,

  -- メタ情報
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 同一代理店+レポートの重複請求書を防止
  CONSTRAINT uq_invoices_agency_report UNIQUE (agency_id, monthly_report_id)
);

-- ============================================
-- インデックス
-- ============================================
CREATE INDEX idx_invoices_agency ON invoices(agency_id);
CREATE INDEX idx_invoices_monthly_report ON invoices(monthly_report_id);
CREATE INDEX idx_invoices_sent_at ON invoices(sent_at DESC);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 管理者は全請求書を閲覧可能（作成・更新は不可）
CREATE POLICY "管理者は全請求書を閲覧可能" ON invoices
  FOR SELECT USING (get_user_role() = 'system_admin');

-- 代理店ユーザーは閲覧可能代理店の請求書のみ閲覧可能
CREATE POLICY "代理店ユーザーは閲覧可能代理店の請求書のみ" ON invoices
  FOR SELECT USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- 代理店ユーザーは閲覧可能代理店の請求書を作成可能
CREATE POLICY "代理店ユーザーは請求書作成可能" ON invoices
  FOR INSERT WITH CHECK (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- 代理店ユーザーは未送付の請求書のみ更新可能
CREATE POLICY "代理店ユーザーは未送付請求書のみ更新可能" ON invoices
  FOR UPDATE USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
    AND sent_at IS NULL
  )
  WITH CHECK (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
    AND sent_at IS NULL
  );

-- 代理店ユーザーは請求書を削除できない（明示的拒否）
CREATE POLICY "代理店ユーザーは請求書削除不可" ON invoices
  FOR DELETE USING (
    get_user_role() = 'system_admin'
  );

-- ============================================
-- Trigger: updated_at 自動更新
-- ============================================
-- update_updated_at() 関数は 001_initial_schema.sql で定義済み
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
