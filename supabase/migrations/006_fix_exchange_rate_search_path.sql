-- update_exchange_rate に SET search_path = public を追加
-- (003_secure_functions.sql の修正を本番適用)

CREATE OR REPLACE FUNCTION public.update_exchange_rate(
  p_monthly_report_id UUID,
  p_new_rate NUMERIC
)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
