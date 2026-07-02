DROP FUNCTION IF EXISTS search_open_groups;
CREATE FUNCTION search_open_groups(search_term text DEFAULT '')
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
