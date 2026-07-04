-- ============================================
-- import置換時の孤児防止（CASCADE の明示検証）
-- ============================================
-- 要望#4 / 4-B（docs/4B_distribution_calc_design.md）。
-- import の月次置換は monthly_reports 行を削除して入れ替える（dashboard.ts）。
-- distributions.monthly_report_id は 036 で ON DELETE CASCADE 済みのため、
-- 月削除時に当該月の分配明細は自動削除され孤児は残らない。
-- 本マイグレはその不変条件を「明示的に検証」して将来のリグレッションを早期検知する
-- （スキーマ変更は行わない＝検証のみ）。

DO $$
DECLARE
  v_delete_rule TEXT;
BEGIN
  SELECT rc.delete_rule
  INTO v_delete_rule
  FROM information_schema.referential_constraints rc
  JOIN information_schema.table_constraints tc
    ON tc.constraint_name = rc.constraint_name
   AND tc.constraint_schema = rc.constraint_schema
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.constraint_schema = tc.constraint_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'distributions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'monthly_report_id'
  LIMIT 1;

  IF v_delete_rule IS NULL THEN
    RAISE EXCEPTION 'distributions.monthly_report_id の外部キーが見つかりません（036 を確認）';
  END IF;

  IF v_delete_rule <> 'CASCADE' THEN
    RAISE EXCEPTION 'distributions.monthly_report_id は ON DELETE CASCADE である必要があります（現在: %）。import置換で孤児が残ります', v_delete_rule;
  END IF;

  RAISE NOTICE 'OK: distributions.monthly_report_id は ON DELETE CASCADE（import置換で孤児なし）';
END;
$$;
