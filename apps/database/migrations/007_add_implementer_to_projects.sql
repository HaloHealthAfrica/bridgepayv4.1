-- Migration: 007_add_implementer_to_projects.sql
-- Description: Add implementer_user_id column to projects table
-- Created: 2024

BEGIN;

-- Add implementer_user_id column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS implementer_user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL;

-- Create index for implementer lookups
CREATE INDEX IF NOT EXISTS idx_projects_implementer_user_id ON projects(implementer_user_id);

-- Update existing projects: if a project has an implementer assigned via metadata, migrate it
-- (This is optional - only if you have existing data with implementer info in metadata)
-- UPDATE projects SET implementer_user_id = (metadata->>'implementer_user_id')::uuid 
-- WHERE metadata->>'implementer_user_id' IS NOT NULL;

COMMIT;


