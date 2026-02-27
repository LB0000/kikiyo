-- update_liver_agency: p_new_agency_id が NULL の場合のハンドリングを修正
-- ライバーの代理店をクリアする際に commission_rate が NULL になり
-- agency_reward_jpy の計算が壊れる問題を修正

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
      cd.estimated_bonus * COALESCE(mr.rate, 0) * v_commission_rate,
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
