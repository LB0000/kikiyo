-- 特別ボーナステーブル追加
-- TikTokから管理者（1次代理店）に付与される特別ボーナスを管理

CREATE TABLE public.special_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_month TEXT NOT NULL,
  reason TEXT,
  amount_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_jpy NUMERIC(14,0) NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  agency_id UUID REFERENCES public.agencies(id),
  liver_id UUID REFERENCES public.livers(id),
  monthly_report_id UUID REFERENCES public.monthly_reports(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_special_bonuses_report ON public.special_bonuses(monthly_report_id);

-- RLS
ALTER TABLE public.special_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "管理者は全特別ボーナスにフルアクセス" ON public.special_bonuses
  FOR ALL USING (public.get_user_role() = 'system_admin');

CREATE POLICY "代理店ユーザーは閲覧可能代理店の特別ボーナスのみ" ON public.special_bonuses
  FOR SELECT USING (
    public.get_user_role() = 'agency_user'
    AND agency_id IN (SELECT public.get_viewable_agency_ids())
  );

-- update_exchange_rate 関数を更新（special_bonuses の JPY も再計算）
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

  UPDATE public.special_bonuses
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
