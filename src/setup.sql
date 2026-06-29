-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/bagvusfmlvlenomoqzmn/sql/new)

CREATE TABLE IF NOT EXISTS folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE history ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id) ON DELETE SET NULL;

ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES folders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_history_folder_id ON history(folder_id);

-- Enable Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Policies for folders table
CREATE POLICY "Users can view their own folders"
  ON folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
  ON folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders FOR DELETE
  USING (auth.uid() = user_id);

-- Allow 'link' type in history
ALTER TABLE history DROP CONSTRAINT IF EXISTS history_type_check;
ALTER TABLE history ADD CONSTRAINT history_type_check CHECK (type = ANY (ARRAY['text'::text, 'file'::text, 'link'::text]));
