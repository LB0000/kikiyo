-- ============================================
-- セキュリティ強化（2026-08-19 全体コードレビュー対応）
--
-- 1. csv_data INSERT ポリシーを system_admin 専用に
--    002 のポリシーは agency_user にも INSERT を許可していたが（upload_agency_id のみ検証、
--    agency_id / monthly_report_id / 金額列は無検証）、アプリ側の CSV 取込（importCsvData）は
--    admin 専用で agency_user が INSERT する正規機能は存在しない。
--    放置すると agency_user が PostgREST 直叩きで自代理店の csv_data 行を捏造し、
--    請求書プレビュー／請求書作成／ダッシュボードの金額を水増しできる。
--
-- 2. next_invoice_number() の EXECUTE を anon / authenticated から剥奪
--    SECURITY DEFINER かつ role ガード無しのため、anon が /rest/v1/rpc/next_invoice_number を
--    連打すると請求書番号が欠番化する（連番要件に抵触）。
--    呼び出し元は service_role（createAdminClient）のみなので、get_user_role() による
--    ガードは付けず（service_role では NULL となり自分の処理が壊れる）、GRANT で限定する。
-- ============================================

-- 1. csv_data INSERT: admin のみ
-- 本番へは SQL Editor で手動適用するため、再実行しても 42710 で止まらないよう
-- 新ポリシー側にも DROP IF EXISTS を付ける（適用済み環境での再実行を許容する）。
DROP POLICY IF EXISTS "代理店ユーザーはCSV挿入可能" ON public.csv_data;
DROP POLICY IF EXISTS "管理者のみCSV挿入可能" ON public.csv_data;
CREATE POLICY "管理者のみCSV挿入可能" ON public.csv_data
  FOR INSERT WITH CHECK (public.get_user_role() = 'system_admin');

-- 2. next_invoice_number: service_role のみ実行可
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(TEXT) TO service_role;
