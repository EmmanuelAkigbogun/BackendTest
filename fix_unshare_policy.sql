-- Allow group admins to unshare shared posts (in addition to the original sharer)
-- Also allow folder owners to unshare
DROP POLICY IF EXISTS "Sharers can unshare" ON shared_folders;
CREATE POLICY "Sharers can unshare"
  ON shared_folders FOR DELETE
  USING (
    shared_by = auth.uid()
    OR
    -- Group admins of the group the folder was shared with can unshare
    (
      share_type = 'group'
      AND shared_with_group IN (
        SELECT group_id FROM group_members
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    )
  );
