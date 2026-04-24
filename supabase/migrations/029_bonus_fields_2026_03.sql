-- ============================================
-- 2026.3 ボーナス項目の刷新
-- ============================================
-- TikTok Backstage のボーナス構造が2026.3から変更された：
--
--   旧 (〜2026.2): Rookie milestones / Revenue scale / Activeness / Off-platform
--   新 (2026.3〜): Ranked up / Maintained tiers / Activeness incentive /
--                  Off-platform / Off-platform (2026.3) / Incremental revenue
--
-- 支払い対象は ①〜⑤ の合計のみ。売上増加（Incremental revenue incentive）は
-- 社内参照だけで代理店には見せず、支払いにも含めない。
--
-- 旧列（bonus_rookie_*, bonus_revenue_scale）は過去データ保持のため削除しない。

-- ============================================
-- csv_data に新列追加
-- ============================================

-- ① Estimated bonus - Ranked up
ALTER TABLE csv_data ADD COLUMN bonus_ranked_up NUMERIC DEFAULT 0;
-- ② Estimated bonus - Maintained tiers
ALTER TABLE csv_data ADD COLUMN bonus_maintained_tiers NUMERIC DEFAULT 0;
-- ⑤ Estimated bonus - Off-platform creator task (2026.3)
ALTER TABLE csv_data ADD COLUMN bonus_off_platform_2026_03 NUMERIC DEFAULT 0;
-- 売上増加（代理店には非表示）
ALTER TABLE csv_data ADD COLUMN bonus_incremental_revenue NUMERIC DEFAULT 0;

-- 支払ボーナス（= ①+②+③+④+⑤、売上増加は含まない）
-- 派生値だが集計クエリの高速化のため保存する
ALTER TABLE csv_data ADD COLUMN payment_bonus NUMERIC DEFAULT 0;

COMMENT ON COLUMN csv_data.bonus_ranked_up IS '① Estimated bonus - Ranked up (2026.3〜)';
COMMENT ON COLUMN csv_data.bonus_maintained_tiers IS '② Estimated bonus - Maintained tiers (2026.3〜)';
COMMENT ON COLUMN csv_data.bonus_off_platform_2026_03 IS '⑤ Estimated bonus - Off-platform creator task (2026.3)';
COMMENT ON COLUMN csv_data.bonus_incremental_revenue IS '売上増加（Incremental revenue incentive）— 代理店には非表示・支払対象外';
COMMENT ON COLUMN csv_data.payment_bonus IS '支払ボーナス（①+②+③+④+⑤、売上増加は含まない）。2026.3以降はこの列を報酬計算に使用';
COMMENT ON COLUMN csv_data.estimated_bonus IS 'CSVの Estimated bonus 列そのまま（2026.3以降は ①〜⑤+売上増加 の合計、参考値）。報酬計算には payment_bonus を使うこと';

-- ============================================
-- バックフィル: 既存レコード（2026.2以前）は payment_bonus = estimated_bonus
-- ============================================
-- 旧ルールのデータには売上増加列が存在せず、estimated_bonus が支払合計と一致する。
-- 2026.3以降のCSVは import 側で payment_bonus を別途計算して投入する。
UPDATE csv_data
SET payment_bonus = estimated_bonus
WHERE payment_bonus = 0 AND estimated_bonus <> 0;

-- ============================================
-- インデックス: 月次集計で使用
-- ============================================
CREATE INDEX IF NOT EXISTS idx_csv_data_payment_bonus
  ON csv_data(monthly_report_id, payment_bonus);

-- ============================================
-- update_exchange_rate 関数を payment_bonus ベースに置き換え
-- ============================================
-- 旧: total_reward_jpy = estimated_bonus × rate （2026.3以降は売上増加が混入する）
-- 新: total_reward_jpy = payment_bonus × rate
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
