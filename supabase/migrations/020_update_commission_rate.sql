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
  UPDATE public.csv_data cd
  SET agency_reward_jpy = ROUND(
    cd.estimated_bonus * COALESCE(mr.rate, 0) * p_new_commission_rate,
    2
  )
  FROM public.monthly_reports mr
  WHERE cd.agency_id = p_agency_id
    AND cd.monthly_report_id = mr.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ライバーの代理店変更時に csv_data.agency_id と agency_reward_jpy を更新するRPC関数

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

  -- 手数料率を一度だけ取得
  SELECT COALESCE(commission_rate, 0) INTO v_commission_rate
  FROM public.agencies WHERE id = p_new_agency_id;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ライバーの tiktok_username 変更時に csv_data.liver_id を再紐付けするRPC関数

CREATE OR REPLACE FUNCTION public.relink_liver_csv_data(
  p_liver_id UUID,
  p_old_tiktok_username TEXT,
  p_new_tiktok_username TEXT
)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 旧ユーザー名で紐付いていた行の紐付けを解除
  UPDATE public.csv_data
  SET liver_id = NULL
  WHERE liver_id = p_liver_id;

  -- 新ユーザー名で再紐付け（大文字小文字無視）
  IF p_new_tiktok_username IS NOT NULL AND p_new_tiktok_username != '' THEN
    UPDATE public.csv_data
    SET liver_id = p_liver_id
    WHERE LOWER(handle) = LOWER(p_new_tiktok_username);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
