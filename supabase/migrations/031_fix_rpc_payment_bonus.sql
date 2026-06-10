-- ============================================
-- RPC の報酬再計算を payment_bonus ベースに統一
-- ============================================
-- 029 で update_exchange_rate は payment_bonus ベースに修正済みだが、
-- update_commission_rate（020）と update_liver_agency（021）は
-- estimated_bonus ベースのまま残っていた。
-- 2026.3 以降の新ルールでは estimated_bonus に売上増加（支払対象外）が
-- 含まれるため、手数料率変更・ライバー代理店変更を実行すると
-- agency_reward_jpy に売上増加分が混入し過払いとなる。
-- 旧ルール行（〜2026.2）は payment_bonus = estimated_bonus で
-- バックフィル済みのため、この修正で結果は変わらない。

-- ============================================
-- update_commission_rate: estimated_bonus → payment_bonus
-- ============================================
CREATE OR REPLACE FUNCTION public.update_commission_rate(
  p_agency_id UUID,
  p_new_commission_rate NUMERIC
)
RETURNS void AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- update_liver_agency: estimated_bonus → payment_bonus
-- （021 の NULL ハンドリングは維持）
-- ============================================
CREATE OR REPLACE FUNCTION public.update_liver_agency(
  p_liver_id UUID,
  p_new_agency_id UUID
)
RETURNS void AS $$
DECLARE
  v_commission_rate NUMERIC;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
