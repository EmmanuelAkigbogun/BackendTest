-- ============================================================
-- 1. Create personal_edits table (member-only edits visible only to self)
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

-- ============================================================
-- 2. Restrict global UPDATE on history to admins/sharers/owners only
--    Members must use personal_edits for editing others' items
-- ============================================================
DROP POLICY IF EXISTS "Anyone with access can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Admins can update items globally" ON history;

CREATE POLICY "Admins can update items globally"
  ON history FOR UPDATE
  USING (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id))
  WITH CHECK (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id));

-- ============================================================
-- 3. Enable realtime for personal_edits
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'personal_edits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE personal_edits;
  END IF;
END $$;
