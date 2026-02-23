-- 017: livers.liver_id に TikTok Creator ID をバックフィル。
-- csv_data.creator_id から紐付け済みライバーの liver_id を埋める。
-- 手動入力済み（liver_id IS NOT NULL）のレコードは上書きしない。
-- 同一ライバーに複数CSV行がある場合は最新のものを採用。

UPDATE livers
SET    liver_id = sub.creator_id,
       updated_at = now()
FROM (
    SELECT DISTINCT ON (cd.liver_id) cd.liver_id AS lid, cd.creator_id
    FROM   csv_data cd
    WHERE  cd.liver_id IS NOT NULL
      AND  cd.creator_id IS NOT NULL
    ORDER BY cd.liver_id, cd.created_at DESC
) sub
WHERE  livers.id = sub.lid
  AND  livers.liver_id IS NULL;
