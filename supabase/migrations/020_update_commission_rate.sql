-- 手数料率変更時に csv_data.agency_reward_jpy を再計算するRPC関数

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
  UPDATE public.csv_data
  SET agency_reward_jpy = ROUND(
    estimated_bonus * COALESCE(
      (SELECT rate FROM public.monthly_reports WHERE monthly_reports.id = csv_data.monthly_report_id), 0
    ) * p_new_commission_rate,
    2
  )
  WHERE agency_id = p_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
