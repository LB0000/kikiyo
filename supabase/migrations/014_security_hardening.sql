-- ============================================
-- セキュリティ強化マイグレーション
-- C2: handle_new_user トリガーの権限昇格防止
-- H6: get_user_role / get_viewable_agency_ids に SET search_path 追加
-- H7: monthly_reports INSERT を system_admin に制限
-- H8: refund INSERT を system_admin のみに修正
-- H9: livers UPDATE に WITH CHECK 追加
-- H10: applications INSERT に agency_id チェック追加
-- ============================================

-- C2: handle_new_user — user_metadata からのロール取得を廃止し、常に agency_user をデフォルトに
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_app_meta_data->>'role')::public.user_role,
      'agency_user'::public.user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- H6: get_user_role / get_viewable_agency_ids に SET search_path 追加
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION get_viewable_agency_ids()
RETURNS SETOF UUID AS $$
  SELECT agency_id FROM profile_viewable_agencies WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- H7: monthly_reports INSERT を system_admin に制限
DROP POLICY IF EXISTS "認証済みユーザーはレポート作成可能" ON monthly_reports;
CREATE POLICY "管理者はレポート作成可能" ON monthly_reports
  FOR INSERT WITH CHECK (get_user_role() = 'system_admin');

-- H8: refund INSERT を system_admin のみに修正（Server Action と一致させる）
DROP POLICY IF EXISTS "代理店ユーザーは返金作成可能" ON refunds;

-- H9: livers UPDATE に WITH CHECK 追加（agency_id 変更防止）
DROP POLICY IF EXISTS "代理店ユーザーはライバー更新可能" ON livers;
CREATE POLICY "代理店ユーザーはライバー更新可能" ON livers
  FOR UPDATE
  USING (
    get_user_role() = 'agency_user'
    AND agency_id IN (SELECT get_viewable_agency_ids())
  )
  WITH CHECK (
    agency_id IN (SELECT get_viewable_agency_ids())
  );

-- H10: applications INSERT に agency_id チェック追加
DROP POLICY IF EXISTS "代理店ユーザーは申請作成可能" ON applications;
CREATE POLICY "代理店ユーザーは申請作成可能" ON applications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      agency_id IS NULL
      OR agency_id IN (SELECT get_viewable_agency_ids())
      OR get_user_role() = 'system_admin'
    )
  );

-- update_updated_at に SET search_path 追加
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
