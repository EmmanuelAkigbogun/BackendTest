-- Batch version of folder_is_accessible: check multiple folders in one call
CREATE OR REPLACE FUNCTION public.folders_are_accessible(fids uuid[])
RETURNS TABLE(folder_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest.id
  FROM unnest(fids) unnest(id)
  WHERE public.folder_is_accessible(unnest.id);
END;
$$;

-- Batch version of can_edit_in_folder: check multiple folders in one call
CREATE OR REPLACE FUNCTION public.can_edit_in_folders(fids uuid[])
RETURNS TABLE(folder_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest.id
  FROM unnest(fids) unnest(id)
  WHERE public.can_edit_in_folder(unnest.id);
END;
$$;
