-- 1. Allow folder creator to see all items in their shared folders
DROP POLICY IF EXISTS "Users can view items in shared folders" ON history;
CREATE POLICY "Users can view items in shared folders"
  ON history FOR SELECT
  USING (folder_id IN (
    SELECT folder_id FROM shared_folders
    WHERE share_type = 'all'
       OR shared_with_user = auth.uid()
       OR shared_by = auth.uid()
       OR shared_with_group IN (
           SELECT group_id FROM group_members WHERE user_id = auth.uid()
         )
  ));

-- 2. Cascade delete history when folder is deleted
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'history'::regclass
    AND confrelid = 'folders'::regclass
    AND contype = 'f'
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE history DROP CONSTRAINT ' || con_name;
  END IF;
  ALTER TABLE history ADD CONSTRAINT history_folder_id_fkey
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;
END $$;

-- 3. Enable real-time replication
ALTER PUBLICATION supabase_realtime ADD TABLE history;
ALTER PUBLICATION supabase_realtime ADD TABLE folders;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_folders;
