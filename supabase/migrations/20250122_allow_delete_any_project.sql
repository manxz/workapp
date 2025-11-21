-- Allow any authenticated user to delete any project
-- This is useful for team collaboration where anyone should be able to clean up projects

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

CREATE POLICY "Authenticated users can delete any project" ON projects
  FOR DELETE 
  USING ((select auth.uid()) IS NOT NULL);

