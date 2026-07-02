-- ============================================================
-- Combined fix: run this once in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Add edited_by column (fix_admin_edit.sql)
-- ============================================================
ALTER TABLE history ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Sharers can update items in shared folders" ON history;
DROP POLICY IF EXISTS "Folder owners can update items in their folders" ON history;
DROP POLICY IF EXISTS "Group admins can update items in shared folders" ON history;
DROP POLICY IF EXISTS "Admins can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Anyone with access can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Sharers can delete any in their shared folders" ON history;
DROP POLICY IF EXISTS "Admins can delete items in folder tree" ON history;

CREATE OR REPLACE FUNCTION public.can_edit_in_folder(fid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  cur_id uuid := fid;
BEGIN
  LOOP
    IF cur_id IS NULL THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM shared_folders WHERE folder_id = cur_id AND shared_by = auth.uid()) THEN
      RETURN TRUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM shared_folders sf
      JOIN group_members gm ON gm.group_id = sf.shared_with_group
      WHERE sf.folder_id = cur_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    ) THEN
      RETURN TRUE;
    END IF;
    SELECT parent_id INTO cur_id FROM folders WHERE id = cur_id;
  END LOOP;
END;
$$;

CREATE POLICY "Anyone with access can update items in folder tree"
  ON history FOR UPDATE
  USING (folder_id IS NOT NULL AND public.folder_is_accessible(folder_id))
  WITH CHECK (folder_id IS NOT NULL AND public.folder_is_accessible(folder_id));

CREATE POLICY "Admins can delete items in folder tree"
  ON history FOR DELETE
  USING (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id));

-- ============================================================
-- 2. Create personal_edits + restrict history UPDATE (fix_personal_edits.sql)
-- ============================================================
CREATE TABLE IF NOT EXISTS personal_edits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  history_id uuid REFERENCES history(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL,
  file_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(history_id, user_id)
);

ALTER TABLE personal_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own personal edits" ON personal_edits;
CREATE POLICY "Users can view own personal edits"
  ON personal_edits FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own personal edits" ON personal_edits;
CREATE POLICY "Users can create own personal edits"
  ON personal_edits FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own personal edits" ON personal_edits;
CREATE POLICY "Users can update own personal edits"
  ON personal_edits FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own personal edits" ON personal_edits;
CREATE POLICY "Users can delete own personal edits"
  ON personal_edits FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone with access can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Admins can update items globally" ON history;

CREATE POLICY "Admins can update items globally"
  ON history FOR UPDATE
  USING (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id))
  WITH CHECK (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'personal_edits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE personal_edits;
  END IF;
END $$;

-- ============================================================
-- 3. Share notification columns + triggers (fix_share_notifications.sql)
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_viewed_shares_at timestamptz DEFAULT now();

ALTER TABLE group_share_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE group_join_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE group_share_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE group_join_requests SET updated_at = created_at WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_group_share_requests_updated_at ON group_share_requests;
CREATE TRIGGER set_group_share_requests_updated_at
  BEFORE UPDATE ON group_share_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_group_join_requests_updated_at ON group_join_requests;
CREATE TRIGGER set_group_join_requests_updated_at
  BEFORE UPDATE ON group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. Allow users to update own profile (needed for markShareNotifsRead)
-- ============================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 5. Create dismissed_notifications table for per-item dismissals
-- ============================================================
CREATE TABLE IF NOT EXISTS dismissed_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, source_table, source_id)
);

ALTER TABLE dismissed_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own dismissed notifications" ON dismissed_notifications;
CREATE POLICY "Users can manage own dismissed notifications"
  ON dismissed_notifications FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'dismissed_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE dismissed_notifications;
  END IF;
END $$;
