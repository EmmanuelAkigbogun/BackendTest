-- SECURITY DEFINER function to check folder access without RLS recursion
CREATE OR REPLACE FUNCTION public.can_access_folder(folder_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = folder_id AND f.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM shared_folders sf
    WHERE sf.folder_id = folder_id
      AND (sf.share_type = 'all'
           OR sf.shared_with_user = auth.uid()
           OR sf.shared_with_group IN (
             SELECT gm.group_id FROM group_members gm WHERE gm.user_id = auth.uid()
           ))
  );
$$;

-- Re-add the shared folders policy on folders using the function (no recursion)
DROP POLICY IF EXISTS "Users can view shared folders" ON folders;
CREATE POLICY "Users can view shared folders"
  ON folders FOR SELECT
  USING (public.can_access_folder(id));
