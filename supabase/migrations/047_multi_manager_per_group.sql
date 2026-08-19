-- ============================================
-- 1グループに複数マネージャー（閲覧用）を許可
-- ============================================
-- 2026-08-19 発注元電話で確定した運用モデルへの対応:
--   ・トータルサイド＝マネージャー集結会社。MG報酬40%はグループ一括でトータルサイド社へ
--     支払い、個人への内部振り分けは先方で完結（システムは持たない）。
--   ・小田氏ほか今後のマネージャーは全員トータルサイド所属で、杉谷氏と同じ閲覧画面に
--     ログインできる必要がある（議事録: tmp/20260819_電話議事録_マネージャー報酬モデル確定.md）。
--
-- 金額経路は一切変えない:
--   ・支払先マネージャーの真実は distribution_rules(payee_kind='manager') のまま。
--   ・manager_agencies は (a) manager_user の閲覧RLSスコープ（get_user_manager_agency_ids）
--     (b) csv_data.manager_id 派生キャッシュの同期元、の2用途のみ。
--   ・(a) は複数行でもそのまま正しく動く。(b) のスカラーサブクエリだけが複数行で
--     実行時エラーになるため、is_payee=true の1行（代表＝支払先）に限定する。

-- 1) PK を agency_id 単独 → (agency_id, manager_id) 複合へ
ALTER TABLE manager_agencies DROP CONSTRAINT manager_agencies_pkey;
ALTER TABLE manager_agencies ADD PRIMARY KEY (agency_id, manager_id);

-- 2) 代表（支払先・csv_data.manager_id 同期対象）フラグ。既存行は各グループ1行のみ＝全て true
ALTER TABLE manager_agencies ADD COLUMN is_payee BOOLEAN NOT NULL DEFAULT true;

-- 代表は1グループ最大1行（部分一意インデックスで強制）
CREATE UNIQUE INDEX uq_manager_agencies_payee ON manager_agencies(agency_id) WHERE is_payee;

COMMENT ON COLUMN manager_agencies.is_payee IS
  '代表マネージャー（csv_data.manager_id 同期対象）。閲覧のみの追加マネージャーは false。支払先の真実は distribution_rules';

-- 3) recalculate_distributions 再定義（046 ベース）。
--    変更点は csv_data.manager_id 同期サブクエリへの AND ma.is_payee 追加のみ。
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

  -- 3. csv_data.manager_id を manager_agencies の代表行から同期
  --    （派生キャッシュ。真実は manager_agencies。047: 複数MG対応で is_payee 行に限定）
  UPDATE public.csv_data cd
  SET manager_id = (
    SELECT ma.manager_id FROM public.manager_agencies ma
    WHERE ma.agency_id = cd.agency_id AND ma.is_payee
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
