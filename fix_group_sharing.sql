-- 1. Add folder_id column to group_join_requests
ALTER TABLE group_join_requests ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE CASCADE;

-- 2. Create group_share_requests table
CREATE TABLE IF NOT EXISTS group_share_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE group_share_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create share requests" ON group_share_requests;
CREATE POLICY "Users can create share requests"
  ON group_share_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Group admins can view share requests" ON group_share_requests;
CREATE POLICY "Group admins can view share requests"
  ON group_share_requests FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own share requests" ON group_share_requests;
CREATE POLICY "Users can view their own share requests"
  ON group_share_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Group admins can update share requests" ON group_share_requests;
CREATE POLICY "Group admins can update share requests"
  ON group_share_requests FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "No direct deletes on share requests" ON group_share_requests;
CREATE POLICY "No direct deletes on share requests"
  ON group_share_requests FOR DELETE
  USING (false);

-- 3. Update shared_folders INSERT policy to allow admin approval of pending requests
DROP POLICY IF EXISTS "Folder owners can share" ON shared_folders;
CREATE POLICY "Folder owners can share"
  ON shared_folders FOR INSERT
  WITH CHECK (
    -- Normal case: folder owner shares directly
    (
      auth.uid() = (SELECT user_id FROM folders WHERE id = folder_id)
      AND (
        shared_with_group IS NULL
        OR (
          EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = shared_with_group AND gm.user_id = auth.uid()
            AND (
              (SELECT g.type FROM groups g WHERE g.id = shared_with_group) = 'open'
              OR gm.role = 'admin'
            )
          )
        )
      )
    )
    OR
    -- Group admin approves a pending share request
    (
      shared_with_group IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = shared_with_group AND gm.user_id = auth.uid() AND gm.role = 'admin'
      )
      AND (
        EXISTS (
          SELECT 1 FROM group_share_requests gsr
          WHERE gsr.group_id = shared_with_group
          AND gsr.folder_id = folder_id
          AND gsr.status = 'pending'
        )
        OR
        EXISTS (
          SELECT 1 FROM group_join_requests gjr
          WHERE gjr.group_id = shared_with_group
          AND gjr.folder_id = folder_id
          AND gjr.status = 'pending'
        )
      )
    )
  );

-- 4. Update search_shareable_groups to return ALL groups (no membership filter)
DROP FUNCTION IF EXISTS search_shareable_groups;
CREATE FUNCTION search_shareable_groups(search_term text DEFAULT '')
RETURNS TABLE (id uuid, name text, type text, created_by uuid, created_at timestamptz, member_count bigint)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name, g.type, g.created_by, g.created_at,
    (SELECT count(*)::bigint FROM group_members gm WHERE gm.group_id = g.id) AS member_count
  FROM groups g
  WHERE (search_term = '' OR g.name ILIKE '%' || search_term || '%')
  ORDER BY g.name
  LIMIT 20;
END;
$$;

-- 5. Allow admins/creators to remove members from groups
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR auth.uid() = (SELECT created_by FROM groups WHERE id = group_members.group_id)
    OR auth.uid() IN (
      SELECT gm2.user_id FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id AND gm2.role = 'admin'
    )
  );
