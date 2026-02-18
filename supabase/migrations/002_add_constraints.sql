-- ============================================
-- ユニーク制約追加
-- ============================================

-- ライバーIDの重複を防止（NULLは許可）
CREATE UNIQUE INDEX unique_liver_id ON livers(liver_id) WHERE liver_id IS NOT NULL;

-- 同一月次レポート内のcreator_id重複を防止
CREATE UNIQUE INDEX unique_csv_entry ON csv_data(monthly_report_id, creator_id);

-- 返金テーブルのliver_idインデックス
CREATE INDEX idx_refunds_liver ON refunds(liver_id);

-- ============================================
-- RLSポリシー追加
-- ============================================

-- refunds: 代理店ユーザーが返金を作成可能（自分の閲覧可能代理店のみ）
CREATE POLICY "代理店ユーザーは返金作成可能" ON refunds
  FOR INSERT WITH CHECK (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- refunds: 代理店ユーザーが返金を更新可能（ソフトデリート用）
CREATE POLICY "代理店ユーザーは返金更新可能" ON refunds
  FOR UPDATE USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- livers: 代理店ユーザーがライバーを作成可能（自分の閲覧可能代理店のみ）
CREATE POLICY "代理店ユーザーはライバー作成可能" ON livers
  FOR INSERT WITH CHECK (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  );

-- csv_data: 既存のINSERTポリシーを厳格化（upload_agency_idの検証）
DROP POLICY IF EXISTS "代理店ユーザーはCSV挿入可能" ON csv_data;
CREATE POLICY "代理店ユーザーはCSV挿入可能" ON csv_data
  FOR INSERT WITH CHECK (
    get_user_role() = 'system_admin'
    OR (
      get_user_role() = 'agency_user'
      AND upload_agency_id IN (SELECT get_viewable_agency_ids())
    )
  );
