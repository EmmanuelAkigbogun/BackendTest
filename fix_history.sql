-- Drop ALL old history policies
DROP POLICY IF EXISTS "Allow delete for owners" ON history;
DROP POLICY IF EXISTS "Users can delete own items or sharer can delete any" ON history;
DROP POLICY IF EXISTS "Users can insert into shared folders" ON history;
DROP POLICY IF EXISTS "Users can insert own rows" ON history;
DROP POLICY IF EXISTS "Users can update own items in shared folders" ON history;
DROP POLICY IF EXISTS "Users can update their own history" ON history;
DROP POLICY IF EXISTS "Users can view items in shared folders" ON history;
DROP POLICY IF EXISTS "Utilizatorii isi pot vedea mesajele" ON history;
DROP POLICY IF EXISTS "Utilizatorii pot trimite mesaje" ON history;

-- Fresh clean policies for history
CREATE POLICY "Users can view own items"
  ON history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view items in shared folders"
  ON history FOR SELECT
  USING (folder_id IN (
    SELECT folder_id FROM shared_folders
    WHERE share_type = 'all'
       OR shared_with_user = auth.uid()
       OR shared_with_group IN (
           SELECT group_id FROM group_members WHERE user_id = auth.uid()
         )
  ));

CREATE POLICY "Users can insert own items"
  ON history FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own items"
  ON history FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own items"
  ON history FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Sharers can delete any in their shared folders"
  ON history FOR DELETE
  USING (folder_id IN (
    SELECT folder_id FROM shared_folders WHERE shared_by = auth.uid()
  ));
