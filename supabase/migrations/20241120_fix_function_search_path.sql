-- Migration: Fix Function Search Path for Security
-- Description: Set immutable search_path on trigger function to prevent security issues
-- Date: 2024-11-20

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTES
-- ============================================================================

-- Why this fix matters:
-- Without SET search_path, the function is vulnerable to search_path manipulation
-- attacks where malicious users could inject their own functions.
--
-- SET search_path = public ensures the function only looks in the public schema
-- and prevents security vulnerabilities.

