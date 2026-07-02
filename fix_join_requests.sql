CREATE TABLE IF NOT EXISTS group_join_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON group_join_requests;
CREATE POLICY "Users can view their own requests"
  ON group_join_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Group admins can view requests" ON group_join_requests;
CREATE POLICY "Group admins can view requests"
  ON group_join_requests FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create join requests" ON group_join_requests;
CREATE POLICY "Users can create join requests"
  ON group_join_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Group admins can update requests" ON group_join_requests;
CREATE POLICY "Group admins can update requests"
  ON group_join_requests FOR UPDATE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can delete requests" ON group_join_requests;
CREATE POLICY "Group admins can delete requests"
  ON group_join_requests FOR DELETE
  USING (
    group_id IN (
      SELECT id FROM groups WHERE created_by = auth.uid()
      UNION
      SELECT group_id FROM group_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
