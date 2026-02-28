-- update_exchange_rate: 為替レート更新時に monthly_reports 行をロックし
-- 同時更新による不整合を防止する

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

  UPDATE public.csv_data
  SET
    total_reward_jpy = ROUND(estimated_bonus * p_new_rate, 2),
    agency_reward_jpy = ROUND(estimated_bonus * p_new_rate * COALESCE(
      (SELECT commission_rate FROM public.agencies WHERE agencies.id = csv_data.agency_id), 0
    ), 2)
  WHERE monthly_report_id = p_monthly_report_id;

  UPDATE public.refunds
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;

  UPDATE public.special_bonuses
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
