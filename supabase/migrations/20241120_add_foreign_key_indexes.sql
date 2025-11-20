-- Migration: Add Foreign Key Indexes and Remove Unused Indexes
-- Description: Optimize query performance by indexing foreign keys and removing dead indexes
-- Date: 2024-11-20

-- ============================================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ============================================================================

-- Index for channels.created_by (user's channels lookup)
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);

-- Index for projects.created_by (user's projects lookup - HIGH PRIORITY)
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- Index for tasks.created_by (user's tasks lookup)
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- ============================================================================
-- REMOVE UNUSED INDEXES
-- ============================================================================

-- Drop unused status index (never used, redundant with other indexes)
DROP INDEX IF EXISTS tasks_status_idx;

-- Drop unused reactions index (obsolete since reactions moved to JSONB array)
DROP INDEX IF EXISTS idx_messages_reactions;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Benefits:
-- 1. Faster user project/channel/task lookups (indexed foreign keys)
-- 2. Faster RLS policy checks (auth checks use these foreign keys)
-- 3. Reduced storage overhead (removed unused indexes)
-- 4. Faster INSERT/UPDATE operations (fewer indexes to maintain)

