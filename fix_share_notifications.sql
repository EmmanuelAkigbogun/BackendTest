-- ============================================================
-- 1. Add last_viewed_shares_at to profiles
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_viewed_shares_at timestamptz DEFAULT now();

-- ============================================================
-- 2. Add updated_at to request tables for approval tracking
-- ============================================================
ALTER TABLE group_share_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE group_join_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
UPDATE group_share_requests SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE group_join_requests SET updated_at = created_at WHERE updated_at IS NULL;

-- ============================================================
-- 3. Trigger to auto-update updated_at on row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_group_share_requests_updated_at ON group_share_requests;
CREATE TRIGGER set_group_share_requests_updated_at
  BEFORE UPDATE ON group_share_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_group_join_requests_updated_at ON group_join_requests;
CREATE TRIGGER set_group_join_requests_updated_at
  BEFORE UPDATE ON group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
