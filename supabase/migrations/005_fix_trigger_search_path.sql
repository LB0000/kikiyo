-- ============================================
-- handle_new_user トリガー関数の search_path 修正
--
-- GoTrue (auth スキーマ) からトリガーが呼ばれる際、
-- search_path に public が含まれず profiles テーブルや
-- user_role 型が見つからないエラーを修正。
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'agency_user'::public.user_role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガーを再作成（関数の参照を更新）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
