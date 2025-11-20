-- Migration: Optimize RLS Policies for Performance
-- Description: Fix auth RLS initialization plan warnings and remove duplicate policies
-- Date: 2024-11-20

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with optimized auth checks
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

-- Drop ALL existing policies to clean up duplicates
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON messages;
DROP POLICY IF EXISTS "Users can read messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
DROP POLICY IF EXISTS "Users can update message reactions" ON messages;

-- Recreate with optimized, non-duplicate policies
CREATE POLICY "Users can read messages" ON messages
  FOR SELECT 
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT 
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update message reactions" ON messages
  FOR UPDATE 
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE 
  USING ((select auth.uid())::text = author_id);

-- ============================================================================
-- CHANNELS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can create channels" ON channels;
DROP POLICY IF EXISTS "Channel creators can update their channels" ON channels;

-- Recreate with optimized auth checks
CREATE POLICY "Authenticated users can create channels" ON channels
  FOR INSERT 
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Channel creators can update their channels" ON channels
  FOR UPDATE 
  USING ((select auth.uid())::text = created_by);

-- ============================================================================
-- MESSAGE_REACTIONS TABLE (if it exists)
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can add reactions" ON message_reactions;
DROP POLICY IF EXISTS "Users can delete own reactions" ON message_reactions;

-- Recreate with optimized auth checks
CREATE POLICY "Authenticated users can add reactions" ON message_reactions
  FOR INSERT 
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can delete own reactions" ON message_reactions
  FOR DELETE 
  USING ((select auth.uid())::text = user_id);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;

-- Recreate with optimized auth checks
CREATE POLICY "Authenticated users can create tasks" ON tasks
  FOR INSERT 
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Recreate with optimized auth checks
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT 
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE 
  USING ((select auth.uid())::text = created_by);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE 
  USING ((select auth.uid())::text = created_by);

