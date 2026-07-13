-- ============================================
-- pgTAP: 多段分配計算（4-B）テスト
-- ============================================
-- 実行: supabase db test （要 pgtap 拡張）。
-- ⚠️ 本ファイルはマイグレ 032〜046 適用後の DB 前提。未適用環境では実行できない。
-- 数値シナリオは docs/4B_distribution_calc_design.md の検証表に対応:
--   rate=15, source A 元本=$300→4500円, M率0.30 / 三次B率0.20 / scout S率0.05,
--   S担当=L1($100→1500円)。
-- マイグレ046: インボイス未登録の分配先は分配額から2%控除（控除分は total_side 残差へ戻す。scout は別軸で控除のみ）。
--   フィクスチャ: M=登録済（控除なし）/ B・S=未登録（2%控除）
--   並列(あ): M=1350(控除0), B=900−18=882, total_side=2250+18=2268, scout=75−1.5=73.5（source合計=4500 維持）
--   カスケード(い・控除前): M=1350, B=630, total_side=2520, scout=75
-- 現状デフォルトは並列(あ)。カスケードへ切替時（039 差替後）は下部の期待値ブロックを入替える。

BEGIN;
SELECT plan(15);

-- --------------------------------------------
-- パート1: 039 戦略ヘルパ（auth 不要・純粋関数）
-- --------------------------------------------
-- 並列(あ)デフォルト: base は常に gross（running を無視）
SELECT is( calc_distribution_base(4500, 0),    4500::numeric, 'base(parallel): running=0 → gross' );
SELECT is( calc_distribution_base(4500, 1350), 4500::numeric, 'base(parallel): running>0 でも gross 据置' );
-- カスケード(い)に切替えた場合の期待（039 差替後に有効化）:
-- SELECT is( calc_distribution_base(4500, 1350), 3150::numeric, 'base(cascade): gross - running' );
SELECT is( calc_distribution_amount(4500, 0.30), 1350::numeric, 'amount = ROUND(base*rate,2)' );
SELECT is( calc_distribution_amount(1500, 0.05),   75::numeric, 'amount: scout 1500*0.05' );

-- --------------------------------------------
-- パート2: recalculate_distributions エンドツーエンド
-- --------------------------------------------
-- admin フィクスチャ（recalc の admin ガードは auth.uid() のロールを見る）
INSERT INTO auth.users (id, email)
  VALUES ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local')
  ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role)
  VALUES ('00000000-0000-0000-0000-0000000000ad', 'system_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'system_admin';

-- auth.uid() = admin として実行
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}';

-- 月次レポート（rate=15）
INSERT INTO monthly_reports (id, data_month, rate, revenue_task)
  VALUES ('00000000-0000-0000-0000-0000000000a1', '202603', 15, 'task_1');

-- 代理店 A（source）と三次代理店 B（payee）
INSERT INTO agencies (id, name, commission_rate)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'AgencyA', 0),
         ('00000000-0000-0000-0000-0000000000b2', 'AgencyB', 0);

-- マネージャー M（インボイス登録済＝控除なし）/ スカウト S（未登録＝2%控除）
INSERT INTO managers (id, name, invoice_registration_number)
  VALUES ('00000000-0000-0000-0000-0000000000a3', 'ManagerM', 'T1234567890123');
INSERT INTO scouts   (id, name) VALUES ('00000000-0000-0000-0000-0000000000a4', 'ScoutS');
INSERT INTO manager_agencies (agency_id, manager_id)
  VALUES ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a3');

-- ライバー L1（scout 担当）/ L2（scout なし）, ともに代理店 A
INSERT INTO livers (id, name, agency_id) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'L1', '00000000-0000-0000-0000-0000000000a2'),
  ('00000000-0000-0000-0000-0000000000c2', 'L2', '00000000-0000-0000-0000-0000000000a2');
INSERT INTO liver_scouts (liver_id, scout_id)
  VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a4');

-- 分配ルール: M=0.30 / B=0.20 / S=0.05（いずれも source=A スコープ）
INSERT INTO distribution_rules (agency_id, payee_kind, manager_id, rate)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'manager', '00000000-0000-0000-0000-0000000000a3', 0.30);
INSERT INTO distribution_rules (agency_id, payee_kind, payee_agency_id, rate)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'agency', '00000000-0000-0000-0000-0000000000b2', 0.20);
INSERT INTO distribution_rules (agency_id, payee_kind, scout_id, rate)
  VALUES ('00000000-0000-0000-0000-0000000000a2', 'scout', '00000000-0000-0000-0000-0000000000a4', 0.05);

-- csv_data: L1 payment_bonus=100, L2=200（合計300・代理店A）
INSERT INTO csv_data (liver_id, agency_id, monthly_report_id, payment_bonus) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 100),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 200);

-- 実行
SELECT recalculate_distributions('00000000-0000-0000-0000-0000000000a1');

-- 期待値（並列(あ)＋046 ロイヤリティ控除）
SELECT is(
  (SELECT amount_jpy FROM distributions WHERE payee_kind='manager' AND manager_id='00000000-0000-0000-0000-0000000000a3'),
  1350::numeric, 'manager M = ROUND(4500*0.30) = 1350（登録済・控除なし）');
SELECT is(
  (SELECT royalty_deduction_jpy FROM distributions WHERE payee_kind='manager' AND manager_id='00000000-0000-0000-0000-0000000000a3'),
  0::numeric, 'manager M: インボイス登録済 → 控除0');
SELECT is(
  (SELECT amount_jpy FROM distributions WHERE payee_kind='agency' AND payee_agency_id='00000000-0000-0000-0000-0000000000b2'),
  882::numeric, '三次B = 900 − 2%控除18 = 882（未登録・並列）');
SELECT is(
  (SELECT royalty_deduction_jpy FROM distributions WHERE payee_kind='agency' AND payee_agency_id='00000000-0000-0000-0000-0000000000b2'),
  18::numeric, '三次B: 未登録 → 控除 ROUND(900*0.02) = 18');
SELECT is(
  (SELECT amount_jpy FROM distributions WHERE payee_kind='total_side'),
  2268::numeric, 'total_side = 4500-1350-900+控除戻し18 = 2268（並列）');
SELECT is(
  (SELECT amount_jpy FROM distributions WHERE payee_kind='scout' AND scout_id='00000000-0000-0000-0000-0000000000a4'),
  73.5::numeric, 'scout S = 75 − 2%控除1.5 = 73.5（未登録・別軸）');
SELECT is(
  (SELECT royalty_deduction_jpy FROM distributions WHERE payee_kind='scout' AND scout_id='00000000-0000-0000-0000-0000000000a4'),
  1.5::numeric, 'scout S: 未登録 → 控除 ROUND(75*0.02) = 1.5');

-- 元本一致: source A の分配合計（scout 除く）＝ gross 4500
SELECT is(
  (SELECT SUM(amount_jpy) FROM distributions
    WHERE source_agency_id='00000000-0000-0000-0000-0000000000a2' AND payee_kind <> 'scout'),
  4500::numeric, '元本一致: source A 合計（scout除く）= 4500');

-- カスケード(い)へ切替えた場合の期待（039 差替後に上の3アサートを置換）:
-- 三次B=630 / total_side=2520 / 元本合計=4500

-- 冪等性: 2回目実行で行数不変
SELECT recalculate_distributions('00000000-0000-0000-0000-0000000000a1');
SELECT is(
  (SELECT COUNT(*) FROM distributions WHERE monthly_report_id='00000000-0000-0000-0000-0000000000a1'),
  4::bigint, '冪等: 2回実行しても4行（manager/agency/total_side/scout）');

-- rate NULL の月は分配を生成しない
INSERT INTO monthly_reports (id, data_month, rate, revenue_task)
  VALUES ('00000000-0000-0000-0000-0000000000a9', '202602', NULL, 'task_1');
SELECT recalculate_distributions('00000000-0000-0000-0000-0000000000a9');
SELECT is(
  (SELECT COUNT(*) FROM distributions WHERE monthly_report_id='00000000-0000-0000-0000-0000000000a9'),
  0::bigint, 'rate NULL → 分配なし');

-- 非adminは拒否
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';
SELECT throws_ok(
  $$ SELECT recalculate_distributions('00000000-0000-0000-0000-0000000000a1') $$,
  '権限がありません', 'admin以外は拒否');

SELECT * FROM finish();
ROLLBACK;
