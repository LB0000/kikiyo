-- ============================================
-- relink_liver_csv_data に分配再計算を配線（監査 H-1）＋認可バイパス修正
-- ============================================
-- ライバーの tiktok_username 変更時、relink_liver_csv_data（020定義）が
-- csv_data.liver_id を張り替える（旧紐付け解除→新handleで再紐付け）が、
-- 再計算 recalculate_distributions を呼んでいなかった。
-- スカウト分配は liver_scouts JOIN csv_data ON cd.liver_id（040:143）で liver_id 依存のため、
-- handle 変更後もスカウト分配が旧 attribution のまま確定明細（distributions）に残る。
-- 次回 import / 為替・手数料・代理店変更まで是正されないバグ。
--
-- 対処:
--   1) 認可判定を `!=` → `IS DISTINCT FROM` に修正（auth.uid()=NULL 素通り対策・C-1と同一）。
--   2) 張り替えの影響月（旧紐付け行＋新handle一致行）を収集し、各月を recalculate_distributions で再生成。
--      ORDER BY で再計算のロック取得順を統一（並行更新時のデッドロック防止・041と同一方針）。
--   3) 多重防御として PUBLIC/anon から EXECUTE を剥奪し authenticated のみに限定。
--
-- 呼び出し元 src/lib/actions/livers.ts:174 は system_admin セッションで実行されるため、
-- SECURITY DEFINER 内の auth.uid() は元の管理者のまま＝PERFORM recalc のガードも通過する。

CREATE OR REPLACE FUNCTION public.relink_liver_csv_data(
  p_liver_id UUID,
  p_old_tiktok_username TEXT,
  p_new_tiktok_username TEXT
)
RETURNS void AS $$
DECLARE
  v_report_id UUID;
  v_affected  UUID[];
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) IS DISTINCT FROM 'system_admin' THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 張り替えで影響を受ける月を、変更前に収集（旧紐付け行＋新handle一致行の和集合）。
  -- ORDER BY で再計算のロック取得順を統一。
  SELECT ARRAY(
    SELECT DISTINCT monthly_report_id
    FROM public.csv_data
    WHERE monthly_report_id IS NOT NULL
      AND (
        liver_id = p_liver_id
        OR (
          p_new_tiktok_username IS NOT NULL
          AND p_new_tiktok_username != ''
          AND LOWER(handle) = LOWER(p_new_tiktok_username)
        )
      )
    ORDER BY monthly_report_id
  ) INTO v_affected;

  -- 旧ユーザー名で紐付いていた行の紐付けを解除
  UPDATE public.csv_data
  SET liver_id = NULL
  WHERE liver_id = p_liver_id;

  -- 新ユーザー名で再紐付け（大文字小文字無視）
  IF p_new_tiktok_username IS NOT NULL AND p_new_tiktok_username != '' THEN
    UPDATE public.csv_data
    SET liver_id = p_liver_id
    WHERE LOWER(handle) = LOWER(p_new_tiktok_username);
  END IF;

  -- ★H-1: 影響月の分配明細を再生成（スカウト分配の attribution を最新の紐付けに追随）
  FOREACH v_report_id IN ARRAY COALESCE(v_affected, ARRAY[]::UUID[])
  LOOP
    PERFORM public.recalculate_distributions(v_report_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 多重防御: anon 直呼びを封鎖
REVOKE EXECUTE ON FUNCTION public.relink_liver_csv_data(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relink_liver_csv_data(UUID, TEXT, TEXT) TO authenticated;
