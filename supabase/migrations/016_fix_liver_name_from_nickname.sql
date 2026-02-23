-- 016: ライバー自動登録時に creator_nickname が livers.name（本名）に
-- 誤って格納されていた問題を修正。
-- csv_data.creator_nickname と一致する livers.name を NULL にリセットする。
-- 手動で本名を入力済みのライバーを誤ってリセットしないよう、
-- 自動登録の特徴（address, birth_date, contact が全て NULL）を条件に加える。

UPDATE livers
SET    name = NULL,
       updated_at = now()
WHERE  id IN (
    SELECT DISTINCT l.id
    FROM   livers l
    JOIN   csv_data cd ON cd.liver_id = l.id
    WHERE  l.name IS NOT NULL
      AND  l.name = cd.creator_nickname
      AND  l.address IS NULL
      AND  l.birth_date IS NULL
      AND  l.contact IS NULL
);
