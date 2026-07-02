-- Add edited_by column to track who edited
ALTER TABLE history ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop existing policies before recreating
DROP POLICY IF EXISTS "Sharers can update items in shared folders" ON history;
DROP POLICY IF EXISTS "Folder owners can update items in their folders" ON history;
DROP POLICY IF EXISTS "Group admins can update items in shared folders" ON history;
DROP POLICY IF EXISTS "Admins can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Anyone with access can update items in folder tree" ON history;
DROP POLICY IF EXISTS "Sharers can delete any in their shared folders" ON history;
DROP POLICY IF EXISTS "Admins can delete items in folder tree" ON history;

-- Recursive helper: can the current user admin-delete in this folder (or any parent)?
-- Admin = shared_by (sharer) or group admin only (NOT folder owner, because a member
-- who creates a sub-folder shouldn't get delete power over others' items)
CREATE OR REPLACE FUNCTION public.can_edit_in_folder(fid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  cur_id uuid := fid;
BEGIN
  LOOP
    IF cur_id IS NULL THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM shared_folders WHERE folder_id = cur_id AND shared_by = auth.uid()) THEN
      RETURN TRUE;
    END IF;
    IF EXISTS (
      SELECT 1 FROM shared_folders sf
      JOIN group_members gm ON gm.group_id = sf.shared_with_group
      WHERE sf.folder_id = cur_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    ) THEN
      RETURN TRUE;
    END IF;
    SELECT parent_id INTO cur_id FROM folders WHERE id = cur_id;
  END LOOP;
END;
$$;

-- EDIT: Anyone with folder access can update items in the folder tree (both admin & member)
CREATE POLICY "Anyone with access can update items in folder tree"
  ON history FOR UPDATE
  USING (folder_id IS NOT NULL AND public.folder_is_accessible(folder_id))
  WITH CHECK (folder_id IS NOT NULL AND public.folder_is_accessible(folder_id));

-- DELETE: Only admins/sharers/owners can delete items in the folder tree
CREATE POLICY "Admins can delete items in folder tree"
  ON history FOR DELETE
  USING (folder_id IS NOT NULL AND public.can_edit_in_folder(folder_id));
