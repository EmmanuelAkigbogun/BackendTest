-- Table to track per-user hidden history items
CREATE TABLE IF NOT EXISTS hidden_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  history_id uuid REFERENCES history(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, history_id)
);

ALTER TABLE hidden_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hidden items"
  ON hidden_history FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE hidden_history;
