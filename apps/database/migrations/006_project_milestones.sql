-- Migration: 006_project_milestones.sql
-- Description: Create project_milestones table for milestone tracking
-- Created: 2024

BEGIN;

-- Project Milestones Table
CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(19, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'KES',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'rejected'
    due_date DATE,
    completed_date TIMESTAMPTZ,
    evidence TEXT, -- URL or reference to evidence file
    evidence_metadata JSONB DEFAULT '{}'::jsonb, -- Additional evidence info (files, links, etc.)
    verifier_user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL, -- Who verified this milestone
    verified_at TIMESTAMPTZ,
    verification_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_index INTEGER DEFAULT 0 -- For ordering milestones within a project
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_verifier_user_id ON project_milestones(verifier_user_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_order_index ON project_milestones(project_id, order_index);

-- Add trigger to update updated_at
CREATE OR REPLACE TRIGGER update_project_milestones_updated_at
BEFORE UPDATE ON project_milestones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;


