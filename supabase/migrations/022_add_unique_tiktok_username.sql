-- livers.tiktok_username にcase-insensitiveなユニークインデックスを追加
-- CSV紐付け（handle ↔ tiktok_username）の整合性を保証する
-- NULLは複数行で許容（部分インデックス）

CREATE UNIQUE INDEX unique_liver_tiktok_username
  ON public.livers (LOWER(tiktok_username))
  WHERE tiktok_username IS NOT NULL;
