-- ============================================
-- 既存3RPC末尾に PERFORM recalculate_distributions(...) を追記
-- ============================================
-- 要望#4 / 4-B（docs/4B_distribution_calc_design.md）。
-- 既存ロジック本体は最新定義（029/031）を完全踏襲し、末尾に分配再計算を1行追加するのみ。
-- SQL内 PERFORM 採用＝既存RPCと同一トランザクション（原子性）・複数月波及の呼び漏れ防止・
-- RLSコンテキスト継承。import経路のみ Server Action 側から呼ぶ（041では触れない）。
--
-- ⚠️ 本体差分は「末尾の PERFORM 追加」だけ。ロジックを変更しないこと
--    （変更時は 029/031 と本ファイルの両方を更新）。

-- --------------------------------------------
-- update_exchange_rate（本体は 029 と同一 ＋ 末尾 PERFORM）
-- 為替レート変更は当該月のみ影響 → その1月を再計算。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_exchange_rate(
  p_monthly_report_id UUID,
  p_new_rate NUMERIC
)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 対象行を排他ロック（同時更新防止）
  PERFORM 1 FROM public.monthly_reports
    WHERE id = p_monthly_report_id
    FOR UPDATE;

  UPDATE public.monthly_reports SET rate = p_new_rate WHERE id = p_monthly_report_id;

  -- CSV データ: payment_bonus ベースで再計算
  UPDATE public.csv_data
  SET
    total_reward_jpy = ROUND(payment_bonus * p_new_rate, 2),
    agency_reward_jpy = ROUND(payment_bonus * p_new_rate * COALESCE(
      (SELECT commission_rate FROM public.agencies WHERE agencies.id = csv_data.agency_id), 0
    ), 2)
  WHERE monthly_report_id = p_monthly_report_id;

  UPDATE public.refunds
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;

  UPDATE public.special_bonuses
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;

  -- ★4-B: 当該月の分配明細を再生成
  PERFORM public.recalculate_distributions(p_monthly_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------
-- update_commission_rate（本体は 031 と同一 ＋ 末尾 PERFORM）
-- 手数料率変更は対象代理店が現れる全月に影響 → 影響月のみループ再計算。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_commission_rate(
  p_agency_id UUID,
  p_new_commission_rate NUMERIC
)
RETURNS void AS $$
DECLARE
  v_report_id UUID;
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- csv_data.agency_reward_jpy を再計算
  -- 各行のmonthly_report_idに対応するrateを使用（月ごとに為替レートが異なる）
  UPDATE public.csv_data cd
  SET agency_reward_jpy = ROUND(
    cd.payment_bonus * COALESCE(mr.rate, 0) * p_new_commission_rate,
    2
  )
  FROM public.monthly_reports mr
  WHERE cd.agency_id = p_agency_id
    AND cd.monthly_report_id = mr.id;

  -- monthly_report_idがNULLの行はレート不明のため0にセット
  UPDATE public.csv_data
  SET agency_reward_jpy = 0
  WHERE agency_id = p_agency_id
    AND monthly_report_id IS NULL;

  -- ★4-B: 対象代理店が出現する各月の分配明細を再生成
  -- ORDER BY で全呼び出しのロック取得順を統一（並行更新時のデッドロック防止）。
  FOR v_report_id IN
    SELECT DISTINCT monthly_report_id
    FROM public.csv_data
    WHERE agency_id = p_agency_id
      AND monthly_report_id IS NOT NULL
    ORDER BY monthly_report_id
  LOOP
    PERFORM public.recalculate_distributions(v_report_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------
-- update_liver_agency（本体は 031 と同一 ＋ 末尾 PERFORM）
-- ライバーの代理店変更は当該ライバーが現れる全月に影響（旧・新代理店とも、
-- 月単位の全 source 再計算で吸収される）→ 影響月のみループ再計算。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_liver_agency(
  p_liver_id UUID,
  p_new_agency_id UUID
)
RETURNS void AS $$
DECLARE
  v_commission_rate NUMERIC;
  v_report_id UUID;
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 手数料率を取得（NULL の場合は代理店解除なので 0）
  IF p_new_agency_id IS NOT NULL THEN
    SELECT COALESCE(commission_rate, 0) INTO v_commission_rate
    FROM public.agencies WHERE id = p_new_agency_id;

    IF v_commission_rate IS NULL THEN
      RAISE EXCEPTION '指定された代理店が見つかりません';
    END IF;
  ELSE
    v_commission_rate := 0;
  END IF;

  -- monthly_report_idが存在する行を更新
  UPDATE public.csv_data cd
  SET
    agency_id = p_new_agency_id,
    agency_reward_jpy = ROUND(
      cd.payment_bonus * COALESCE(mr.rate, 0) * v_commission_rate,
      2
    )
  FROM public.monthly_reports mr
  WHERE cd.liver_id = p_liver_id
    AND cd.monthly_report_id = mr.id;

  -- monthly_report_idがNULLの行もagency_idは更新
  UPDATE public.csv_data
  SET agency_id = p_new_agency_id, agency_reward_jpy = 0
  WHERE liver_id = p_liver_id
    AND monthly_report_id IS NULL;

  -- ★4-B: 当該ライバーが出現する各月の分配明細を再生成（旧/新代理店とも月単位で吸収）
  -- ORDER BY で全呼び出しのロック取得順を統一（並行更新時のデッドロック防止）。
  FOR v_report_id IN
    SELECT DISTINCT monthly_report_id
    FROM public.csv_data
    WHERE liver_id = p_liver_id
      AND monthly_report_id IS NOT NULL
    ORDER BY monthly_report_id
  LOOP
    PERFORM public.recalculate_distributions(v_report_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
