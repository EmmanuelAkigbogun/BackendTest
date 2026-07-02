-- Check your user ID
SELECT auth.uid() as my_id;

-- Check if you're the shared_by of any folders
SELECT * FROM shared_folders WHERE shared_by = auth.uid();

-- Find items posted by other users that have a folder_id
SELECT h.id, h.folder_id, h.user_id 
FROM history h 
WHERE h.folder_id IS NOT NULL 
  AND h.user_id != auth.uid() 
LIMIT 5;
