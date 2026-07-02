-- Run this entire file at once in Supabase SQL Editor
-- ============================================================
-- 1. Create all new tables
-- ============================================================
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    type text NOT NULL CHECK (type IN ('open', 'closed')),
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
  );
END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS group_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(group_id, user_id)
  );
END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS shared_folders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
    shared_by uuid REFERENCES auth.users(id) NOT NULL,
    share_type text NOT NULL CHECK (share_type IN ('all', 'user', 'group')),
    shared_with_user uuid REFERENCES auth.users(id),
    shared_with_group uuid REFERENCES groups(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL
  );
END $$;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
  );
END $$;

-- ============================================================
-- 2. RLS, indexes, trigger, backfill
-- ============================================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_folders_folder_id ON shared_folders(folder_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. All policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view shared folders" ON folders;
CREATE POLICY "Users can view shared folders"
  ON folders FOR SELECT
  USING (id IN (
    SELECT folder_id FROM shared_folders
    WHERE share_type = 'all'
       OR shared_with_user = auth.uid()
       OR shared_with_group IN (
           SELECT group_id FROM group_members WHERE user_id = auth.uid()
         )
  ));

DROP POLICY IF EXISTS "Anyone can view groups they belong to" ON groups;
CREATE POLICY "Anyone can view groups they belong to"
  ON groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
CREATE POLICY "Authenticated users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Group admins can update groups" ON groups;
CREATE POLICY "Group admins can update groups"
  ON groups FOR UPDATE
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Members can view group members" ON group_members;
CREATE POLICY "Members can view group members"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    OR auth.uid() = (SELECT created_by FROM groups WHERE id = group_id)
  );

DROP POLICY IF EXISTS "Anyone can join open groups" ON group_members;
CREATE POLICY "Anyone can join open groups"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND type = 'open')
    OR auth.uid() = (SELECT created_by FROM groups WHERE id = group_id)
  );

DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view shares they're part of" ON shared_folders;
CREATE POLICY "Users can view shares they're part of"
  ON shared_folders FOR SELECT
  USING (
    shared_by = auth.uid()
    OR share_type = 'all'
    OR shared_with_user = auth.uid()
    OR shared_with_group IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Folder owners can share" ON shared_folders;
CREATE POLICY "Folder owners can share"
  ON shared_folders FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM folders WHERE id = folder_id)
  );

DROP POLICY IF EXISTS "Sharers can unshare" ON shared_folders;
CREATE POLICY "Sharers can unshare"
  ON shared_folders FOR DELETE
  USING (shared_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view items in shared folders" ON history;
CREATE POLICY "Users can view items in shared folders"
  ON history FOR SELECT
  USING (folder_id IN (
    SELECT folder_id FROM shared_folders
    WHERE share_type = 'all'
       OR shared_with_user = auth.uid()
       OR shared_with_group IN (
           SELECT group_id FROM group_members WHERE user_id = auth.uid()
         )
  ));

DROP POLICY IF EXISTS "Users can insert into shared folders" ON history;
CREATE POLICY "Users can insert into shared folders"
  ON history FOR INSERT
  WITH CHECK (
    folder_id IS NULL
    OR folder_id IN (SELECT id FROM folders WHERE user_id = auth.uid())
    OR folder_id IN (
      SELECT folder_id FROM shared_folders
      WHERE share_type = 'all'
         OR shared_with_user = auth.uid()
         OR shared_with_group IN (
             SELECT group_id FROM group_members WHERE user_id = auth.uid()
           )
    )
  );

DROP POLICY IF EXISTS "Users can update own items in shared folders" ON history;
CREATE POLICY "Users can update own items in shared folders"
  ON history FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own items or sharer can delete any" ON history;
CREATE POLICY "Users can delete own items or sharer can delete any"
  ON history FOR DELETE
  USING (
    user_id = auth.uid()
    OR folder_id IN (
      SELECT folder_id FROM shared_folders
      WHERE shared_by = auth.uid()
    )
  );
