-- 特別ボーナスを管理者専用にする
-- 代理店ユーザー向けRLSポリシーを削除

DROP POLICY IF EXISTS "代理店ユーザーは閲覧可能代理店の特別ボーナスのみ" ON public.special_bonuses;
