-- Add owner_id column to lists table
-- This separates the concept of "owner" from "creator" for future flexibility
ALTER TABLE lists ADD COLUMN owner_id UUID REFERENCES auth.users(id);

-- Backfill owner_id with user_id for existing lists
UPDATE lists SET owner_id = user_id WHERE owner_id IS NULL;

-- Make owner_id required
ALTER TABLE lists ALTER COLUMN owner_id SET NOT NULL;

-- Create list_collaborators table
CREATE TABLE IF NOT EXISTS list_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(list_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS list_collaborators_list_id_idx ON list_collaborators(list_id);
CREATE INDEX IF NOT EXISTS list_collaborators_user_id_idx ON list_collaborators(user_id);

-- Enable Row Level Security
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for list_collaborators table
-- Users can view collaborators for lists they own or are collaborators on
CREATE POLICY "Users can view collaborators of accessible lists"
  ON list_collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
      AND (lists.owner_id = auth.uid() OR lists.user_id = auth.uid())
    )
    OR user_id = auth.uid()
  );

-- Only list owners can add collaborators
CREATE POLICY "List owners can add collaborators"
  ON list_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
      AND lists.owner_id = auth.uid()
    )
  );

-- Only list owners can remove collaborators
CREATE POLICY "List owners can remove collaborators"
  ON list_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
      AND lists.owner_id = auth.uid()
    )
  );

-- Only list owners can update permissions
CREATE POLICY "List owners can update collaborator permissions"
  ON list_collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
      AND lists.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_collaborators.list_id
      AND lists.owner_id = auth.uid()
    )
  );

-- Update RLS policies for lists table to include collaborators
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own lists" ON lists;
DROP POLICY IF EXISTS "Users can update own lists" ON lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON lists;

-- Users can view lists they own OR are collaborators on
CREATE POLICY "Users can view own and shared lists"
  ON lists FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM list_collaborators
      WHERE list_collaborators.list_id = lists.id
      AND list_collaborators.user_id = auth.uid()
    )
  );

-- Users can update lists they own
CREATE POLICY "Users can update own lists"
  ON lists FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete lists they own
CREATE POLICY "Users can delete own lists"
  ON lists FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Keep the insert policy unchanged
-- (Already exists from previous migration)

-- Update RLS policies for list_items to include collaborators
-- Drop old policies
DROP POLICY IF EXISTS "Users can view own list items" ON list_items;
DROP POLICY IF EXISTS "Users can create own list items" ON list_items;
DROP POLICY IF EXISTS "Users can update own list items" ON list_items;
DROP POLICY IF EXISTS "Users can delete own list items" ON list_items;

-- Users can view items in lists they own or are collaborators on
CREATE POLICY "Users can view accessible list items"
  ON list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid()
        OR lists.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM list_collaborators
          WHERE list_collaborators.list_id = lists.id
          AND list_collaborators.user_id = auth.uid()
        )
      )
    )
  );

-- Users can create items in lists they own or have edit access to
CREATE POLICY "Users can create items in accessible lists"
  ON list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid()
        OR lists.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM list_collaborators
          WHERE list_collaborators.list_id = lists.id
          AND list_collaborators.user_id = auth.uid()
          AND list_collaborators.permission = 'edit'
        )
      )
    )
  );

-- Users can update items in lists they own or have edit access to
CREATE POLICY "Users can update accessible list items"
  ON list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid()
        OR lists.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM list_collaborators
          WHERE list_collaborators.list_id = lists.id
          AND list_collaborators.user_id = auth.uid()
          AND list_collaborators.permission = 'edit'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid()
        OR lists.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM list_collaborators
          WHERE list_collaborators.list_id = lists.id
          AND list_collaborators.user_id = auth.uid()
          AND list_collaborators.permission = 'edit'
        )
      )
    )
  );

-- Users can delete items in lists they own or have edit access to
CREATE POLICY "Users can delete accessible list items"
  ON list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
      AND (
        lists.user_id = auth.uid()
        OR lists.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM list_collaborators
          WHERE list_collaborators.list_id = lists.id
          AND list_collaborators.user_id = auth.uid()
          AND list_collaborators.permission = 'edit'
        )
      )
    )
  );

-- Create trigger to update updated_at timestamp for list_collaborators
CREATE TRIGGER update_list_collaborators_updated_at
  BEFORE UPDATE ON list_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

