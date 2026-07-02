-- 1. Change history FK from ON DELETE SET NULL to ON DELETE CASCADE
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'history'::regclass
    AND confrelid = 'folders'::regclass
    AND contype = 'f'
  LIMIT 1;
  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE history DROP CONSTRAINT ' || con_name;
  END IF;
  ALTER TABLE history ADD CONSTRAINT history_folder_id_fkey
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;
END $$;

-- 2. Enable real-time replication for tables
ALTER PUBLICATION supabase_realtime ADD TABLE history;
ALTER PUBLICATION supabase_realtime ADD TABLE folders;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_folders;
