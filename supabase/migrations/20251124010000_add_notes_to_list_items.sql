-- Migration: Add notes field to list_items
-- Description: Add a notes column to store additional details for each list item
-- Date: 2024-11-24

-- Add notes column to list_items table
ALTER TABLE list_items 
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Add index for faster queries when filtering items with notes
CREATE INDEX IF NOT EXISTS idx_list_items_has_notes 
  ON list_items((notes IS NOT NULL AND notes != ''));

