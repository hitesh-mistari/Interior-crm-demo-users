-- Fix for "invalid input value for enum team_category_enum: General"
-- This script changes the category column to TEXT, allowing any value (including 'General')
-- Run this on your production database

BEGIN;

-- 1. Alter the column to TEXT (this implicitly casts the enum value to its string representation)
ALTER TABLE teams ALTER COLUMN category TYPE TEXT;

-- 2. Drop the enum type as it's no longer needed (and causes issues if values change)
DROP TYPE IF EXISTS team_category_enum;

COMMIT;
