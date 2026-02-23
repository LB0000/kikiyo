-- 018: livers.account_name に TikTok ニックネームをバックフィル。
-- csv_data.creator_nickname から紐付け済みライバーの account_name を埋める。
-- 手動入力済み（account_name IS NOT NULL）のレコードは上書きしない。
-- 同一ライバーに複数CSV行がある場合は最新のものを採用。

UPDATE livers
SET    account_name = sub.creator_nickname,
       updated_at = now()
FROM (
    SELECT DISTINCT ON (cd.liver_id) cd.liver_id AS lid, cd.creator_nickname
    FROM   csv_data cd
    WHERE  cd.liver_id IS NOT NULL
      AND  cd.creator_nickname IS NOT NULL
      AND  cd.creator_nickname <> ''
    ORDER BY cd.liver_id, cd.created_at DESC
) sub
WHERE  livers.id = sub.lid
  AND  livers.account_name IS NULL;
