-- ============================================
-- user_role enum に manager_user / scout_user を追加
-- ============================================
-- 要望#4（マネージャー単位管理）対応。
-- マネージャー代表者は manager_user、スカウトは scout_user でログインする。
--
-- ⚠️ 重要: ALTER TYPE ... ADD VALUE で追加した enum 値は、同一トランザクション内で
-- 直後に使用できない（Postgres の制約）。このマイグレは enum 追加のみを行う単独ファイルとし、
-- 新ロールを参照する関数・RLS ポリシーは別マイグレ（037）に分離する。
--
-- ※ TS 側 types.ts の UserRole / Database enum、auth.ts の app_metadata.role も
--   追従更新が必要（別コミット）。新ロールの付与は管理者がユーザー作成時に
--   app_metadata.role を設定する既存運用に従う。

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager_user';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'scout_user';
