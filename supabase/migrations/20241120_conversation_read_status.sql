-- Migration: Conversation Read Status
-- Description: Track which conversations each user has read (replaces localStorage)
-- Date: 2024-11-20

-- ============================================================================
-- CONVERSATION_READ_STATUS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_read_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookups for user's read status
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_id 
  ON conversation_read_status(user_id);

-- Fast lookups for specific conversation
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_conversation_id 
  ON conversation_read_status(conversation_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_conversation 
  ON conversation_read_status(user_id, conversation_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE conversation_read_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own read status
CREATE POLICY "Users can view own read status" ON conversation_read_status
  FOR SELECT 
  USING ((select auth.uid()) = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert own read status" ON conversation_read_status
  FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update own read status" ON conversation_read_status
  FOR UPDATE 
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_conversation_read_status_updated_at
  BEFORE UPDATE ON conversation_read_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Mark conversation as read
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id TEXT
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO conversation_read_status (user_id, conversation_id, last_read_at)
  VALUES (auth.uid(), p_conversation_id, NOW())
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    last_read_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- NOTES
-- ============================================================================

-- How it works:
-- 1. When user opens a conversation, call mark_conversation_read()
-- 2. To check for unread: Compare last_read_at with latest message timestamp
-- 3. If any message.created_at > last_read_at, conversation is unread
-- 4. Real-time sync: Subscribe to conversation_read_status changes
-- 5. Works across all devices automatically

