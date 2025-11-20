-- Migration: User App Preferences
-- Description: Store which apps each user has enabled
-- Date: 2024-11-20

-- ============================================================================
-- USER_PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled_apps TEXT[] DEFAULT ARRAY['chat']::TEXT[], -- Default to chat only
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT 
  USING ((select auth.uid()) = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE 
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for fast user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- NOTES
-- ============================================================================

-- Available apps:
-- - 'chat': Messaging, channels, DMs, threads
-- - 'projects': Project tracker with Kanban board
-- - 'todo': Personal to-do list (future)
-- - 'crm': Lightweight CRM (future)
-- - More apps can be added in the future

-- Default behavior:
-- - New users start with only 'chat' enabled
-- - Users can enable/disable apps via settings modal
-- - Disabled apps won't load (code splitting optimization)

