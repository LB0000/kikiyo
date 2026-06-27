-- ============================================
-- マネージャー / スカウト 向け RLS（ヘルパ関数＋ポリシー＋既存テーブル拡張）
-- ============================================
-- 要望#4 / 4-A（docs/4A_data_model_design.md）。
-- ⚠️ 032 で追加した enum 値 manager_user / scout_user を参照するため、
-- 032 とは別マイグレ（別トランザクション）である必要がある。
--
-- 確定仕様（2026-06-24）:
--   - マネージャー代表者: 担当分のみ閲覧。ライバー別の生データ（csv_data）まで閲覧可。
--   - スカウト: 自分の分配明細のみ閲覧（請求書なし・生データ不可）。
--   - スカウト報酬の計算単位は担当ライバー売上ベース（liver_scouts）。
--
-- 既存 get_user_role() / get_viewable_agency_ids()（001/014）と同じ
-- SECURITY DEFINER STABLE SET search_path=public パターンを踏襲。
-- ヘルパは他テーブルのフィルタにのみ使用し、各テーブル自身のポリシーは
-- auth.uid() 直接比較にして RLS 無限再帰を避ける（get_viewable_agency_ids と同方針）。

-- ============================================
-- ヘルパ関数
-- ============================================

-- ログインマネージャーの担当代理店ID集合
CREATE OR REPLACE FUNCTION get_user_manager_agency_ids()
RETURNS SETOF UUID AS $$
  SELECT ma.agency_id
  FROM manager_agencies ma
  JOIN managers m ON m.id = ma.manager_id
  WHERE m.user_id = auth.uid()
    AND m.is_deleted = false;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ログインスカウトの scout_id
CREATE OR REPLACE FUNCTION get_user_scout_id()
RETURNS UUID AS $$
  SELECT id
  FROM scouts
  WHERE user_id = auth.uid()
    AND is_deleted = false
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================
-- 新規テーブルの manager_user / scout_user ポリシー
-- （管理者ポリシーは 033〜036 で付与済み。ここは追加のSELECTのみ）
-- ============================================

-- managers: 本人のみ
CREATE POLICY "マネージャーは自分のレコードのみ閲覧" ON managers
  FOR SELECT USING (get_user_role() = 'manager_user' AND user_id = auth.uid());

-- scouts: 本人 / 担当マネージャー
CREATE POLICY "スカウトは自分のレコードのみ閲覧" ON scouts
  FOR SELECT USING (get_user_role() = 'scout_user' AND user_id = auth.uid());
CREATE POLICY "マネージャーは担当代理店のスカウトを閲覧" ON scouts
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND EXISTS (
      SELECT 1 FROM scout_agencies sa
      WHERE sa.scout_id = scouts.id
        AND sa.agency_id IN (SELECT get_user_manager_agency_ids())
    )
  );

-- manager_agencies: 自分の担当紐付け
-- ⚠️ get_user_manager_agency_ids() は manager_agencies を読むため、ここで呼ぶと
-- 自テーブルのポリシー評価が再帰しうる。よってヘルパを使わず managers を直接結合する
-- （get_viewable_agency_ids/profile_viewable_agencies と同じく、所有テーブルの
--  ポリシーは auth.uid() 直接導出にする安全規則）。
CREATE POLICY "マネージャーは自分の担当紐付けのみ閲覧" ON manager_agencies
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND manager_id IN (
      SELECT id FROM managers WHERE user_id = auth.uid() AND is_deleted = false
    )
  );

-- scout_agencies: 担当マネージャー / 本人
CREATE POLICY "マネージャーは担当代理店のスカウト紐付けを閲覧" ON scout_agencies
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND agency_id IN (SELECT get_user_manager_agency_ids())
  );
CREATE POLICY "スカウトは自分の紐付けのみ閲覧" ON scout_agencies
  FOR SELECT USING (
    get_user_role() = 'scout_user'
    AND scout_id = get_user_scout_id()
  );

-- liver_scouts: 担当マネージャー（自代理店のライバー） / 本人
CREATE POLICY "マネージャーは担当ライバーのスカウト紐付けを閲覧" ON liver_scouts
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND EXISTS (
      SELECT 1 FROM livers l
      WHERE l.id = liver_scouts.liver_id
        AND l.agency_id IN (SELECT get_user_manager_agency_ids())
    )
  );
CREATE POLICY "スカウトは自分のライバー紐付けを閲覧" ON liver_scouts
  FOR SELECT USING (
    get_user_role() = 'scout_user'
    AND scout_id = get_user_scout_id()
  );

-- distribution_rules: 担当マネージャー（適用スコープ＝自代理店）
CREATE POLICY "マネージャーは担当代理店の分配ルールを閲覧" ON distribution_rules
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND agency_id IN (SELECT get_user_manager_agency_ids())
  );

-- distributions: 担当マネージャー（分配元＝自代理店） / スカウト本人
-- 注: total_side 行（source_agency_id IS NULL = 統括の全額受領）は意図的に
-- マネージャー/スカウトに見せない（admin のみ）。担当者には自分のスコープの分配のみ表示する。
-- 監査系（assignment_change_logs / distribution_rule_change_logs）も admin 限定のまま
-- （034/035 の管理者ポリシーのみ。担当者向けポリシーは付与しない＝設計上の意図）。
CREATE POLICY "マネージャーは担当代理店の分配明細のみ" ON distributions
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND source_agency_id IN (SELECT get_user_manager_agency_ids())
  );
CREATE POLICY "スカウトは自分の分配明細のみ" ON distributions
  FOR SELECT USING (
    get_user_role() = 'scout_user'
    AND scout_id = get_user_scout_id()
  );

-- ============================================
-- 既存テーブルへのマネージャー閲覧ポリシー追加（非破壊・SELECT追加のみ）
-- 確定②: マネージャーは担当代理店の生データ（csv_data）/ライバー/代理店を閲覧可。
-- スカウトには生データ閲覧を付与しない（分配明細のみ）。
-- ============================================

-- agencies: 担当代理店の基本情報（名称表示等）
CREATE POLICY "マネージャーは担当代理店のみ閲覧" ON agencies
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND id IN (SELECT get_user_manager_agency_ids())
  );

-- livers: 担当代理店のライバー
CREATE POLICY "マネージャーは担当代理店のライバーのみ閲覧" ON livers
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND agency_id IN (SELECT get_user_manager_agency_ids())
  );

-- csv_data: 担当代理店の生データ
CREATE POLICY "マネージャーは担当代理店のCSVのみ閲覧" ON csv_data
  FOR SELECT USING (
    get_user_role() = 'manager_user'
    AND agency_id IN (SELECT get_user_manager_agency_ids())
  );
