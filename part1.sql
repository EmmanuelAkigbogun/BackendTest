-- Part 1: Create all new tables
CREATE TABLE IF NOT EXISTS groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('open', 'closed')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS shared_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  shared_by uuid REFERENCES auth.users(id) NOT NULL,
  share_type text NOT NULL CHECK (share_type IN ('all', 'user', 'group')),
  shared_with_user uuid REFERENCES auth.users(id),
  shared_with_group uuid REFERENCES groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
