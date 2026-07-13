-- ============================================
-- インボイス未登録の支払先への 2% ロイヤリティ控除
-- ============================================
-- 発注元ルール（2026-07-09 ダミー計算資料）:
--   「インボイス登録がない方については、2％のロイヤリティを差し引く」
-- 適用対象:
--   - 請求書（invoices）: 代理店の invoice_registration_number 未登録 → 総額の2%控除（TS側 invoices.ts で計算）
--   - 分配明細（distributions）: manager / agency / scout の各分配額から2%控除
--     （manager/agency 分の控除はトータルサイド残差へ戻す＝元本一致 Σamount = gross を維持。
--       scout は従来どおり別軸のため控除のみ記録し残差には影響しない）
-- 率の管理: TS側は constants.ts の INVOICE_ROYALTY_RATE、SQL側は calc_royalty_deduction() に一元化。

-- --------------------------------------------
-- 1) scouts / managers にインボイス登録番号（agencies 012 と同形式 T+13桁）
-- --------------------------------------------
ALTER TABLE scouts ADD COLUMN invoice_registration_number TEXT;
ALTER TABLE scouts ADD CONSTRAINT chk_scouts_invoice_registration_number
  CHECK (invoice_registration_number IS NULL OR invoice_registration_number ~ '^T[0-9]{13}$');

ALTER TABLE managers ADD COLUMN invoice_registration_number TEXT;
ALTER TABLE managers ADD CONSTRAINT chk_managers_invoice_registration_number
  CHECK (invoice_registration_number IS NULL OR invoice_registration_number ~ '^T[0-9]{13}$');

-- --------------------------------------------
-- 2) invoices に控除スナップショット（tax_rate と同思想で発行時点を固定）
-- --------------------------------------------
ALTER TABLE invoices ADD COLUMN royalty_rate NUMERIC(4,3) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN royalty_deduction_jpy NUMERIC NOT NULL DEFAULT 0;

-- --------------------------------------------
-- 3) distributions に控除スナップショット
--    amount_jpy は控除後（実際に支払う額）。控除前は amount_jpy + royalty_deduction_jpy で復元できる。
-- --------------------------------------------
ALTER TABLE distributions ADD COLUMN royalty_deduction_jpy NUMERIC NOT NULL DEFAULT 0;

-- --------------------------------------------
-- 4) ロイヤリティ控除額（単一計算口・039 calc_distribution_amount と同思想）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.calc_royalty_deduction(
  p_amount NUMERIC,
  p_is_registered BOOLEAN
)
RETURNS NUMERIC AS $$
  SELECT CASE
    WHEN p_is_registered OR p_amount <= 0 THEN 0
    ELSE ROUND(p_amount * 0.02, 2)
  END;
$$ LANGUAGE sql IMMUTABLE;

-- --------------------------------------------
-- 5) recalculate_distributions を控除対応で再定義（040 ベース・構造は不変）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_distributions(
  p_monthly_report_id UUID
)
RETURNS void AS $$
DECLARE
  v_rate         NUMERIC;
  v_source       RECORD;
  v_rule         RECORD;
  v_scout        RECORD;
  v_gross        NUMERIC;
  v_running      NUMERIC;
  v_base         NUMERIC;
  v_amount       NUMERIC;
  v_residual     NUMERIC;
  v_ts_rate      NUMERIC;
  v_scout_rate   NUMERIC;
  v_registered   BOOLEAN;
  v_royalty      NUMERIC;
  v_royalty_back NUMERIC;
BEGIN
  -- 1. admin ガード（040 と同一。IS DISTINCT FROM で auth.uid()=NULL も拒否）
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 対象月を排他ロックし為替レートを取得（rate 未設定なら何もしない）
  SELECT rate INTO v_rate
  FROM public.monthly_reports
  WHERE id = p_monthly_report_id
  FOR UPDATE;

  IF NOT FOUND OR v_rate IS NULL THEN
    RETURN;
  END IF;

  -- 2. 当該月の分配明細を全削除（冪等再生成）
  DELETE FROM public.distributions WHERE monthly_report_id = p_monthly_report_id;

  -- 3. csv_data.manager_id を manager_agencies から同期（派生キャッシュ。真実は manager_agencies）
  UPDATE public.csv_data cd
  SET manager_id = (
    SELECT ma.manager_id FROM public.manager_agencies ma WHERE ma.agency_id = cd.agency_id
  )
  WHERE cd.monthly_report_id = p_monthly_report_id
    AND cd.agency_id IS NOT NULL;

  -- 4-5. source（代理店）単位で元本集計＋段階分配＋total_side残差吸収
  FOR v_source IN
    SELECT agency_id, ROUND(COALESCE(SUM(payment_bonus), 0) * v_rate, 2) AS gross
    FROM public.csv_data
    WHERE monthly_report_id = p_monthly_report_id
      AND agency_id IS NOT NULL
    GROUP BY agency_id
  LOOP
    v_gross := v_source.gross;
    -- 元本ゼロ（支払対象なし）の source は分配行を作らない
    CONTINUE WHEN v_gross <= 0;

    v_running := 0;
    v_royalty_back := 0;

    -- tier1: マネージャー分配（このスコープの manager 払い先ルール）
    FOR v_rule IN
      SELECT manager_id, rate
      FROM public.distribution_rules
      WHERE agency_id = v_source.agency_id
        AND payee_kind = 'manager'
        AND is_deleted = false
    LOOP
      v_base := public.calc_distribution_base(v_gross, v_running);
      v_amount := public.calc_distribution_amount(v_base, v_rule.rate);
      SELECT m.invoice_registration_number IS NOT NULL INTO v_registered
      FROM public.managers m WHERE m.id = v_rule.manager_id;
      v_royalty := public.calc_royalty_deduction(v_amount, COALESCE(v_registered, false));
      INSERT INTO public.distributions(
        monthly_report_id, source_agency_id, payee_kind, manager_id,
        base_amount_jpy, applied_rate, amount_jpy, royalty_deduction_jpy, tier
      ) VALUES (
        p_monthly_report_id, v_source.agency_id, 'manager', v_rule.manager_id,
        v_base, v_rule.rate, v_amount - v_royalty, v_royalty, 1
      );
      -- 配分としては満額を消費し、控除分は total_side 残差へ戻す（元本一致維持）
      v_running := v_running + v_amount;
      v_royalty_back := v_royalty_back + v_royalty;
    END LOOP;

    -- tier2: 三次代理店分配（このスコープの agency 払い先ルール）
    FOR v_rule IN
      SELECT payee_agency_id, rate
      FROM public.distribution_rules
      WHERE agency_id = v_source.agency_id
        AND payee_kind = 'agency'
        AND is_deleted = false
    LOOP
      v_base := public.calc_distribution_base(v_gross, v_running);
      v_amount := public.calc_distribution_amount(v_base, v_rule.rate);
      SELECT a.invoice_registration_number IS NOT NULL INTO v_registered
      FROM public.agencies a WHERE a.id = v_rule.payee_agency_id;
      v_royalty := public.calc_royalty_deduction(v_amount, COALESCE(v_registered, false));
      INSERT INTO public.distributions(
        monthly_report_id, source_agency_id, payee_kind, payee_agency_id,
        base_amount_jpy, applied_rate, amount_jpy, royalty_deduction_jpy, tier
      ) VALUES (
        p_monthly_report_id, v_source.agency_id, 'agency', v_rule.payee_agency_id,
        v_base, v_rule.rate, v_amount - v_royalty, v_royalty, 2
      );
      v_running := v_running + v_amount;
      v_royalty_back := v_royalty_back + v_royalty;
    END LOOP;

    -- total_side: 残差 = gross − 分配済 ＋ 控除戻し（元本一致 Σamount = gross を保証）
    v_residual := v_gross - v_running;
    IF v_residual < 0 THEN
      RAISE EXCEPTION '分配率の合計が100%%を超えています (source_agency=%, gross=%, allocated=%)',
        v_source.agency_id, v_gross, v_running;
    END IF;
    v_residual := v_residual + v_royalty_back;
    -- 表示用の率スナップショット（gross>0 が保証されているため [0,1] に収まる）
    v_ts_rate := ROUND(v_residual / v_gross, 4);
    INSERT INTO public.distributions(
      monthly_report_id, source_agency_id, payee_kind,
      base_amount_jpy, applied_rate, amount_jpy, tier
    ) VALUES (
      p_monthly_report_id, v_source.agency_id, 'total_side',
      v_gross, v_ts_rate, v_residual, 1
    );
  END LOOP;

  -- 6. スカウト分配（別軸）: liver_scouts 経由＝担当ライバー売上ベース。
  --    常に元本基準（並列固定）。代理店分配と非合算・total_side残差に寄与しない。
  --    インボイス未登録スカウトは分配額から2%控除（控除分は記録のみ）。
  FOR v_scout IN
    SELECT ls.scout_id AS scout_id,
           cd.agency_id AS scope_agency,
           sc.invoice_registration_number IS NOT NULL AS is_registered,
           ROUND(COALESCE(SUM(cd.payment_bonus), 0) * v_rate, 2) AS base_jpy
    FROM public.csv_data cd
    JOIN public.liver_scouts ls ON ls.liver_id = cd.liver_id
    -- 削除済みスカウトには分配しない（base は liver_scouts 起点のためここで除外）
    JOIN public.scouts sc ON sc.id = ls.scout_id AND sc.is_deleted = false
    WHERE cd.monthly_report_id = p_monthly_report_id
      AND cd.agency_id IS NOT NULL
    GROUP BY ls.scout_id, cd.agency_id, sc.invoice_registration_number
  LOOP
    CONTINUE WHEN v_scout.base_jpy <= 0;
    v_scout_rate := public.get_distribution_rate(
      v_scout.scope_agency, 'scout', NULL, v_scout.scout_id, NULL
    );
    CONTINUE WHEN v_scout_rate <= 0;
    v_amount := public.calc_distribution_amount(v_scout.base_jpy, v_scout_rate);
    v_royalty := public.calc_royalty_deduction(v_amount, v_scout.is_registered);
    INSERT INTO public.distributions(
      monthly_report_id, source_agency_id, payee_kind, scout_id,
      base_amount_jpy, applied_rate, amount_jpy, royalty_deduction_jpy, tier
    ) VALUES (
      p_monthly_report_id, v_scout.scope_agency, 'scout', v_scout.scout_id,
      v_scout.base_jpy, v_scout_rate, v_amount - v_royalty, v_royalty, 1
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
