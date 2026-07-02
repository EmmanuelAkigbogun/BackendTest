DROP POLICY IF EXISTS "Creators can delete their groups" ON groups;
CREATE POLICY "Creators can delete their groups"
  ON groups FOR DELETE
  USING (created_by = auth.uid());
