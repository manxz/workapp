-- Migration: Enable Realtime for Lists and Collaborators
-- Description: Enable real-time subscriptions for list_items and list_collaborators tables
-- Date: 2024-11-24

-- ============================================================================
-- ENABLE REALTIME PUBLICATION
-- ============================================================================

-- Add list_items to the realtime publication
-- This allows real-time subscriptions to list item changes (check/uncheck, create, delete)
ALTER PUBLICATION supabase_realtime ADD TABLE list_items;

-- Add list_collaborators to the realtime publication
-- This allows real-time subscriptions to collaborator changes (add/remove)
ALTER PUBLICATION supabase_realtime ADD TABLE list_collaborators;

-- Add lists to the realtime publication (if not already added)
-- This allows real-time subscriptions to list changes (rename, delete)
ALTER PUBLICATION supabase_realtime ADD TABLE lists;

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this migration, real-time subscriptions will work for:
-- 1. List item changes (completed status, content updates, position changes)
-- 2. Collaborator changes (adding/removing collaborators)
-- 3. List changes (name updates, deletions)
--
-- The frontend already has the subscription logic in place:
-- - useListItems.ts: Subscribes to list_items changes
-- - useLists.ts: Subscribes to lists, list_items, and list_collaborators changes

