-- Fix existing teams with invalid 'General' category
-- This script should be run on your production database

-- First, let's check if there are any teams with 'General' category
-- (This will fail if 'General' is not in the enum, which is expected)
-- SELECT * FROM teams WHERE category = 'General';

-- Since 'General' is not a valid enum value, we need to:
-- 1. Add 'General' temporarily to the enum (if needed)
-- 2. Update all 'General' to 'Other'
-- 3. Remove 'General' from the enum

-- Option 1: If you can't query teams with 'General' category (recommended approach)
-- Just ensure all future inserts use 'Other' instead of 'General'
-- The backend code has been fixed to use 'Other'

-- Option 2: If you have teams stuck with 'General' category
-- You'll need to add 'General' to enum, migrate data, then remove it:

-- Step 1: Add 'General' to the enum temporarily
-- ALTER TYPE team_category_enum ADD VALUE 'General';

-- Step 2: Update all teams with 'General' to 'Other'
-- UPDATE teams SET category = 'Other' WHERE category = 'General';

-- Step 3: Remove 'General' from enum (PostgreSQL doesn't support removing enum values directly)
-- You would need to recreate the enum, which is complex. Better to just leave it.

-- RECOMMENDED: Just run this to verify no teams exist with invalid data:
SELECT id, name, category FROM teams WHERE deleted = FALSE;

-- Valid categories are: 'Carpentry', 'Electrical', 'Light Fitting', 'Painting', 'Plumbing', 'Civil', 'Other'
