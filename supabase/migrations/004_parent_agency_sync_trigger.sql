-- ============================================
-- agency_hierarchy変更時にprofile_viewable_agenciesを自動同期
-- Bubble版の「親代理店ユーザー」プライバシールールに相当
--
-- NOTE: agency_hierarchy の PK は (agency_id, parent_agency_id) のため
-- 同一ペアの重複行は存在しない。直接の親のみ同期する（推移的伝搬なし）。
-- ============================================

-- トリガー関数: INSERT時に親代理店のユーザーに閲覧権限を付与
CREATE OR REPLACE FUNCTION sync_viewable_on_hierarchy_insert()
RETURNS TRIGGER AS $$
DECLARE
  parent_user_id UUID;
BEGIN
  SELECT user_id INTO parent_user_id
  FROM agencies
  WHERE id = NEW.parent_agency_id;

  IF parent_user_id IS NOT NULL THEN
    INSERT INTO profile_viewable_agencies (profile_id, agency_id)
    VALUES (parent_user_id, NEW.agency_id)
    ON CONFLICT (profile_id, agency_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガー関数: DELETE時に閲覧権限を削除
-- PK制約により同一ペアは1行のみ。自分自身の代理店への権限は削除しない。
CREATE OR REPLACE FUNCTION sync_viewable_on_hierarchy_delete()
RETURNS TRIGGER AS $$
DECLARE
  parent_user_id UUID;
BEGIN
  SELECT user_id INTO parent_user_id
  FROM agencies
  WHERE id = OLD.parent_agency_id;

  IF parent_user_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- 親代理店ユーザー自身の代理店への閲覧権限は削除しない
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = parent_user_id AND agency_id = OLD.agency_id
  ) THEN
    RETURN OLD;
  END IF;

  DELETE FROM profile_viewable_agencies
  WHERE profile_id = parent_user_id
    AND agency_id = OLD.agency_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガー関数: UPDATE時に旧親の権限削除 + 新親の権限付与
CREATE OR REPLACE FUNCTION sync_viewable_on_hierarchy_update()
RETURNS TRIGGER AS $$
DECLARE
  old_parent_user_id UUID;
  new_parent_user_id UUID;
BEGIN
  -- 親代理店が変更されていない場合はスキップ
  IF OLD.parent_agency_id = NEW.parent_agency_id AND OLD.agency_id = NEW.agency_id THEN
    RETURN NEW;
  END IF;

  -- 旧親の権限削除
  SELECT user_id INTO old_parent_user_id
  FROM agencies
  WHERE id = OLD.parent_agency_id;

  IF old_parent_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = old_parent_user_id AND agency_id = OLD.agency_id
    ) THEN
      DELETE FROM profile_viewable_agencies
      WHERE profile_id = old_parent_user_id
        AND agency_id = OLD.agency_id;
    END IF;
  END IF;

  -- 新親の権限付与
  SELECT user_id INTO new_parent_user_id
  FROM agencies
  WHERE id = NEW.parent_agency_id;

  IF new_parent_user_id IS NOT NULL THEN
    INSERT INTO profile_viewable_agencies (profile_id, agency_id)
    VALUES (new_parent_user_id, NEW.agency_id)
    ON CONFLICT (profile_id, agency_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- トリガー定義
CREATE TRIGGER trg_hierarchy_insert_sync
  AFTER INSERT ON agency_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION sync_viewable_on_hierarchy_insert();

CREATE TRIGGER trg_hierarchy_delete_sync
  AFTER DELETE ON agency_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION sync_viewable_on_hierarchy_delete();

CREATE TRIGGER trg_hierarchy_update_sync
  AFTER UPDATE ON agency_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION sync_viewable_on_hierarchy_update();
