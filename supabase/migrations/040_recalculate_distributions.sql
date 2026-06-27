-- ============================================
-- 中核RPC: recalculate_distributions（多段分配の冪等再生成）
-- ============================================
-- 要望#4 / 4-B（docs/4B_distribution_calc_design.md）。
-- 指定月の distributions を DELETE+INSERT で全再生成する（冪等・何度呼んでも安全）。
-- 既存4経路（import / update_exchange_rate / update_commission_rate /
-- update_liver_agency）は無改変で、後段からこのRPCを呼ぶ（041）。
-- 既存 agency_reward_jpy（invoices経路）には一切干渉しない。
--
-- %の掛け方（並列/カスケード）は 039 の calc_distribution_base() に隔離済み。本体は不変。
--
-- 計算モデル:
--   source（代理店）ごとに gross = ROUND(SUM(payment_bonus) × rate, 2) を元本とし、
--     tier1: マネージャー分配（distribution_rules payee_kind='manager'）
--     tier2: 三次代理店分配（distribution_rules payee_kind='agency'）
--   を順に控除、残り (gross − 分配済) を total_side が吸収（＝元本一致を保証）。
--   スカウトは別軸（liver_scouts ベース・常に元本基準）で、total_side 残差に寄与しない。

CREATE OR REPLACE FUNCTION public.recalculate_distributions(
  p_monthly_report_id UUID
)
RETURNS void AS $$
DECLARE
  v_rate      NUMERIC;
  v_source    RECORD;
  v_rule      RECORD;
  v_scout     RECORD;
  v_gross     NUMERIC;
  v_running   NUMERIC;
  v_base      NUMERIC;
  v_amount    NUMERIC;
  v_residual  NUMERIC;
  v_ts_rate   NUMERIC;
  v_scout_rate NUMERIC;
BEGIN
  -- 1. admin ガード（既存4本と同一）
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
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
      INSERT INTO public.distributions(
        monthly_report_id, source_agency_id, payee_kind, manager_id,
        base_amount_jpy, applied_rate, amount_jpy, tier
      ) VALUES (
        p_monthly_report_id, v_source.agency_id, 'manager', v_rule.manager_id,
        v_base, v_rule.rate, v_amount, 1
      );
      v_running := v_running + v_amount;
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
      INSERT INTO public.distributions(
        monthly_report_id, source_agency_id, payee_kind, payee_agency_id,
        base_amount_jpy, applied_rate, amount_jpy, tier
      ) VALUES (
        p_monthly_report_id, v_source.agency_id, 'agency', v_rule.payee_agency_id,
        v_base, v_rule.rate, v_amount, 2
      );
      v_running := v_running + v_amount;
    END LOOP;

    -- total_side: 残差 = gross − 分配済（元本一致を保証＝丸め誤差を吸収）
    v_residual := v_gross - v_running;
    IF v_residual < 0 THEN
      RAISE EXCEPTION '分配率の合計が100%%を超えています (source_agency=%, gross=%, allocated=%)',
        v_source.agency_id, v_gross, v_running;
    END IF;
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
  --    スコープ代理店は csv_data.agency_id（取込時スナップショット）で揃える。
  FOR v_scout IN
    SELECT ls.scout_id AS scout_id,
           cd.agency_id AS scope_agency,
           ROUND(COALESCE(SUM(cd.payment_bonus), 0) * v_rate, 2) AS base_jpy
    FROM public.csv_data cd
    JOIN public.liver_scouts ls ON ls.liver_id = cd.liver_id
    -- 削除済みスカウトには分配しない（base は liver_scouts 起点のためここで除外）
    JOIN public.scouts sc ON sc.id = ls.scout_id AND sc.is_deleted = false
    WHERE cd.monthly_report_id = p_monthly_report_id
      AND cd.agency_id IS NOT NULL
    GROUP BY ls.scout_id, cd.agency_id
  LOOP
    CONTINUE WHEN v_scout.base_jpy <= 0;
    v_scout_rate := public.get_distribution_rate(
      v_scout.scope_agency, 'scout', NULL, v_scout.scout_id, NULL
    );
    CONTINUE WHEN v_scout_rate <= 0;
    INSERT INTO public.distributions(
      monthly_report_id, source_agency_id, payee_kind, scout_id,
      base_amount_jpy, applied_rate, amount_jpy, tier
    ) VALUES (
      p_monthly_report_id, v_scout.scope_agency, 'scout', v_scout.scout_id,
      v_scout.base_jpy, v_scout_rate,
      public.calc_distribution_amount(v_scout.base_jpy, v_scout_rate), 1
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
