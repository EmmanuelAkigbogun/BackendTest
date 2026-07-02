-- Recursive helper: is folder (or any ancestor) shared with current user?
CREATE OR REPLACE FUNCTION public.folder_is_accessible(fid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  cur_id uuid := fid;
  r record;
BEGIN
  LOOP
    SELECT 1 INTO r
    FROM shared_folders sf
    WHERE sf.folder_id = cur_id
      AND (sf.share_type = 'all'
           OR sf.shared_with_user = auth.uid()
           OR sf.shared_by = auth.uid()
           OR sf.shared_with_group IN (
               SELECT group_id FROM group_members WHERE user_id = auth.uid()
             ));
    IF FOUND THEN
      RETURN TRUE;
    END IF;
    SELECT f.parent_id INTO cur_id FROM folders f WHERE f.id = cur_id;
    IF cur_id IS NULL THEN
      RETURN FALSE;
    END IF;
  END LOOP;
END;
$$;

-- Update can_access_folder to use the recursive function
CREATE OR REPLACE FUNCTION public.can_access_folder(folder_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM folders f
    WHERE f.id = folder_id AND f.user_id = auth.uid()
  ) OR public.folder_is_accessible(folder_id);
$$;

-- Update history policy to use the recursive function
DROP POLICY IF EXISTS "Users can view items in shared folders" ON history;
CREATE POLICY "Users can view items in shared folders"
  ON history FOR SELECT
  USING (
    folder_id IS NOT NULL AND public.folder_is_accessible(folder_id)
  );

-- Allow subfolder creation by shared users (anyone who can access parent can create subfolders)
DROP POLICY IF EXISTS "Users can create their own folders" ON folders;
CREATE POLICY "Users can insert folders"
  ON folders FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      parent_id IS NULL
      OR public.can_access_folder(parent_id)
    )
  );
