-- ============================================
-- ライバーの所属変更に返金／特別ボーナスを追随させる
-- ============================================
-- 2026-08-21 検出。update_liver_agency は csv_data.agency_id を付け替えて
-- recalculate_distributions を回すが、**refunds / special_bonuses の agency_id を
-- 更新していなかった**。両テーブルは liver_id と agency_id の両方を持ち、請求書は
-- agency_id で集計する（fetchInvoiceSourceRows）ため、ライバーを移すと返金だけが
-- 旧代理店に residual として残り、両社の請求額が同時に狂う。
--
-- 実例: とあ（toa_candy.nagoyabakaaaa）を トータルサイド → CANDY へ移した際、
--       202607 の返金 3.15円 がトータルサイドに残り、同社の請求書が
--       0円 − 3.15×40% = **−1円（マイナス請求書）** になった。
--
-- 本マイグレは 043 の update_liver_agency 本体をそのまま踏襲し、
-- csv_data 更新の直後に refunds / special_bonuses の同期を足すだけ。
-- 分配計算（distributions）は csv_data.payment_bonus のみを見るため影響しない。
--
-- ⚠️ 既存データの是正（とあの返金1件）は本マイグレでは行わない。
--    tmp/20260821_fix_refund_agency.sql で別途実施する。

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

  -- 049: 返金／特別ボーナスの所属も追随させる。
  -- 請求書は agency_id で集計するため、ここを更新しないと旧代理店に金額が residual として残る。
  -- is_deleted は絞らない（復活時に旧所属へ戻るのを防ぐ）。金額・USD原資は変更しない。
  UPDATE public.refunds
  SET agency_id = p_new_agency_id
  WHERE liver_id = p_liver_id;

  UPDATE public.special_bonuses
  SET agency_id = p_new_agency_id
  WHERE liver_id = p_liver_id;

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
