DROP POLICY IF EXISTS "Folder owners can share" ON shared_folders;
CREATE POLICY "Folder owners can share"
  ON shared_folders FOR INSERT
  WITH CHECK (
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
  );

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
  WHERE (
    (g.type = 'open' AND EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid()
    ))
    OR (
      g.type = 'closed' AND EXISTS (
        SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = auth.uid() AND gm.role = 'admin'
      )
    )
    OR g.created_by = auth.uid()
  )
  AND (search_term = '' OR g.name ILIKE '%' || search_term || '%')
  ORDER BY g.name
  LIMIT 20;
END;
$$;
