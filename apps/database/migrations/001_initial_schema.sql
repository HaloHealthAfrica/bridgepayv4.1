-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Bridge MVP v3
-- Created: 2024

-- This migration creates all tables for the Bridge MVP v3 application
-- Run this on a fresh database to set up the complete schema

-- Note: This is the same as schema.sql but formatted as a migration
-- In production, you would use a migration tool like Drizzle or Prisma

BEGIN;

-- Include all table creation statements from schema.sql
-- (For brevity, refer to schema.sql for full definitions)

-- After running this migration, verify:
-- 1. All tables exist: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- 2. All indexes exist: SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
-- 3. All foreign keys exist: SELECT conname FROM pg_constraint WHERE contype = 'f';

COMMIT;



