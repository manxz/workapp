-- Migration: User Presence Tracking
-- Description: Track online/offline status of users in real-time
-- Date: 2024-11-22

-- ============================================================================
-- USER_PRESENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookups for online users
CREATE INDEX IF NOT EXISTS idx_user_presence_status 
  ON user_presence(status);

-- Fast lookups for last_seen_at
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen 
  ON user_presence(last_seen_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone can view presence (public information)
CREATE POLICY "Anyone can view user presence" ON user_presence
  FOR SELECT 
  USING (true);

-- Users can only update their own presence
CREATE POLICY "Users can update own presence" ON user_presence
  FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own presence status" ON user_presence
  FOR UPDATE 
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Update user presence
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_presence(
  p_status TEXT DEFAULT 'online'
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO user_presence (user_id, status, last_seen_at)
  VALUES (auth.uid(), p_status, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    status = p_status,
    last_seen_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- How it works:
-- 1. When user logs in, call update_user_presence('online')
-- 2. Update presence every 30 seconds while active
-- 3. On tab close/logout, call update_user_presence('offline')
-- 4. Subscribe to user_presence changes for real-time updates
-- 5. Show green dot for online, gray dot for offline

