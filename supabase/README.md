# Supabase Migrations

This directory contains SQL migration files for database schema changes and optimizations.

## Applying Migrations

### Option 1: Supabase Dashboard (Recommended for this migration)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run it

### Option 2: Supabase CLI

If you have the Supabase CLI set up locally:

```bash
supabase db push
```

## Current Migrations

### `20241120_optimize_rls_policies.sql`

**Purpose**: Optimize Row Level Security policies for better performance

**What it fixes**:
1. **Auth RLS Initialization Plan**: Wraps `auth.uid()` calls in `(select ...)` to ensure they're evaluated once per query instead of once per row
2. **Multiple Permissive Policies**: Removes duplicate policies on the `messages` table that were causing unnecessary evaluations

**Impact**:
- Significantly improves query performance at scale
- Reduces unnecessary policy evaluations
- Fixes all Supabase linter warnings

**Tables affected**:
- `profiles`
- `messages`
- `channels`
- `message_reactions` (if exists)
- `tasks`
- `projects`

**Safety**: This migration uses `DROP POLICY IF EXISTS` so it's safe to run multiple times.

## Best Practices

1. Always backup your database before running migrations
2. Test migrations on a development/staging environment first
3. Review the SQL before applying to production
4. Keep migrations in version control

