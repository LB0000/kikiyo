-- ============================================
-- 管理系RPCの認可バイパス修正（監査 C-1）
-- ============================================
-- update_exchange_rate / update_commission_rate / update_liver_agency は
--   IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'system_admin' THEN ...
-- という判定だが、auth.uid()=NULL（未認証）だとサブクエリが0行→NULLを返し、
--   NULL != 'system_admin' → NULL → IF NULL は false 扱い
-- となって RAISE EXCEPTION が実行されず、SECURITY DEFINER のガードを素通りする。
-- これらは RLS を完全バイパスするため、未認証での財務データ改ざんに直結する。
--
-- 対処:
--   1) 3関数の判定を `!= ` → `IS DISTINCT FROM` に修正（040 recalculate_distributions と同一の堅牢化）。
--      本体ロジックは 041 の定義を完全踏襲し、変更点は各関数の判定1行のみ。
--   2) 多重防御として PUBLIC / anon からの EXECUTE を剥奪し authenticated のみに限定。
--
-- ⚠️ 本ファイルは 041 の関数本体をそのまま複製し、判定行だけを変更している。
--    041 のロジックを今後変更する場合は本ファイルも追随すること（3世代コピペの是正は別途）。

-- --------------------------------------------
-- update_exchange_rate（041と同一・判定行のみ IS DISTINCT FROM）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_exchange_rate(
  p_monthly_report_id UUID,
  p_new_rate NUMERIC
)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  PERFORM 1 FROM public.monthly_reports
    WHERE id = p_monthly_report_id
    FOR UPDATE;

  UPDATE public.monthly_reports SET rate = p_new_rate WHERE id = p_monthly_report_id;

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

  PERFORM public.recalculate_distributions(p_monthly_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- --------------------------------------------
-- update_commission_rate（041と同一・判定行のみ IS DISTINCT FROM）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.update_commission_rate(
  p_agency_id UUID,
  p_new_commission_rate NUMERIC
)
RETURNS void AS $$
DECLARE
  v_report_id UUID;
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  UPDATE public.csv_data cd
  SET agency_reward_jpy = ROUND(
    cd.payment_bonus * COALESCE(mr.rate, 0) * p_new_commission_rate,
    2
  )
  FROM public.monthly_reports mr
  WHERE cd.agency_id = p_agency_id
    AND cd.monthly_report_id = mr.id;

  UPDATE public.csv_data
  SET agency_reward_jpy = 0
  WHERE agency_id = p_agency_id
    AND monthly_report_id IS NULL;

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
-- update_liver_agency（041と同一・判定行のみ IS DISTINCT FROM）
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
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  IF p_new_agency_id IS NOT NULL THEN
    SELECT COALESCE(commission_rate, 0) INTO v_commission_rate
    FROM public.agencies WHERE id = p_new_agency_id;

    IF v_commission_rate IS NULL THEN
      RAISE EXCEPTION '指定された代理店が見つかりません';
    END IF;
  ELSE
    v_commission_rate := 0;
  END IF;

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

  UPDATE public.csv_data
  SET agency_id = p_new_agency_id, agency_reward_jpy = 0
  WHERE liver_id = p_liver_id
    AND monthly_report_id IS NULL;

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

-- --------------------------------------------
-- 多重防御: 管理系RPCの EXECUTE を PUBLIC/anon から剥奪し authenticated のみに限定
-- （PostgREST の /rest/v1/rpc 経由の anon 直呼びを塞ぐ。実際の認可は上記 admin ガードで担保）
-- --------------------------------------------
REVOKE EXECUTE ON FUNCTION public.update_exchange_rate(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_commission_rate(UUID, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_liver_agency(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_distributions(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.update_exchange_rate(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_commission_rate(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_liver_agency(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_distributions(UUID) TO authenticated;
