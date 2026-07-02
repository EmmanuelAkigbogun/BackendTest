-- Allow folder creator to see all items in their shared folders
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
