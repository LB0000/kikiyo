-- 代理店の論理削除（ソフトデリート）対応
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- is_deleted のインデックス（フィルタリング用）
CREATE INDEX IF NOT EXISTS idx_agencies_is_deleted
  ON public.agencies (is_deleted)
  WHERE is_deleted = false;
