-- ============================================
-- update_exchange_rate: 内部認可チェック追加
-- SECURITY DEFINERでRLSをバイパスするため、
-- 関数内でsystem_adminロールを検証する
-- ============================================

CREATE OR REPLACE FUNCTION update_exchange_rate(
  p_monthly_report_id UUID,
  p_new_rate NUMERIC
)
RETURNS void AS $$
BEGIN
  -- 内部認可チェック: system_adminのみ実行可能
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- MonthlyReportのrate更新
  UPDATE monthly_reports SET rate = p_new_rate WHERE id = p_monthly_report_id;

  -- CSVデータの円額再計算（通貨精度のためROUND使用）
  UPDATE csv_data
  SET
    total_reward_jpy = ROUND(estimated_bonus * p_new_rate, 2),
    agency_reward_jpy = ROUND(estimated_bonus * p_new_rate * COALESCE(
      (SELECT commission_rate FROM agencies WHERE agencies.id = csv_data.agency_id), 0
    ), 2)
  WHERE monthly_report_id = p_monthly_report_id;

  -- 返金データの円額再計算
  UPDATE refunds
  SET amount_jpy = ROUND(amount_usd * p_new_rate, 2)
  WHERE monthly_report_id = p_monthly_report_id AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
