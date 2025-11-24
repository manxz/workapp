-- Performance Indexes for Chat App
-- 
-- These indexes significantly improve query performance for:
-- 1. Loading messages by conversation (with time-based pagination)
-- 2. Loading thread replies
-- 3. Checking read status
-- 4. Finding messages by author

-- Index for loading messages in a conversation (with date filtering)
-- Used by: loadMessages() with time-based pagination
-- Covers: WHERE conversation_id = X AND thread_id IS NULL ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC) 
  WHERE thread_id IS NULL;

-- Index for loading thread replies
-- Used by: loadThread() to fetch all replies for a parent message
-- Covers: WHERE thread_id = X ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_messages_thread_created 
  ON messages(thread_id, created_at ASC) 
  WHERE thread_id IS NOT NULL;

-- Index for conversation read status lookups
-- Used by: useUnreadMessages hook to check if conversations have unread messages
-- Covers: WHERE user_id = X AND conversation_id = Y
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_conv
  ON conversation_read_status(user_id, conversation_id);

-- Index for finding messages by author (useful for analytics and user activity)
-- Used by: Future features like "user's message history"
-- Covers: WHERE author_id = X ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_author_created
  ON messages(author_id, created_at DESC);

-- Index for finding recent thread activity (used in thread metadata queries)
-- Used by: loadMessages() when fetching thread metadata for recent threads
-- Covers: WHERE conversation_id = X AND thread_id IS NOT NULL AND created_at >= Y
CREATE INDEX IF NOT EXISTS idx_messages_thread_metadata
  ON messages(conversation_id, thread_id, created_at DESC)
  WHERE thread_id IS NOT NULL;

-- Composite index for unread message detection
-- Used by: useUnreadMessages to efficiently find latest messages per conversation
-- Covers: WHERE conversation_id = X AND thread_id IS NULL AND author_id != Y ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_unread_detection
  ON messages(conversation_id, author_id, created_at DESC)
  WHERE thread_id IS NULL;

-- Add comment explaining the performance improvement
COMMENT ON INDEX idx_messages_conversation_created IS 
  'Optimizes message loading with time-based pagination (2-day window). Expected 10-100x speedup for large conversations.';

COMMENT ON INDEX idx_messages_thread_created IS 
  'Optimizes thread reply loading. Expected 5-50x speedup for threads with many replies.';

COMMENT ON INDEX idx_conversation_read_status_user_conv IS 
  'Optimizes unread status checks. Expected 10-100x speedup when checking multiple conversations.';

