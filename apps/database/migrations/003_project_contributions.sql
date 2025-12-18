-- Project Contributions Migration
-- Adds table for tracking project contributions

-- Project contributions
CREATE TABLE IF NOT EXISTS project_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contributor_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    message TEXT, -- Optional message from contributor
    anonymous BOOLEAN NOT NULL DEFAULT false, -- Whether to show contributor name publicly
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_contributions_project_id ON project_contributions(project_id);
CREATE INDEX idx_project_contributions_contributor_user_id ON project_contributions(contributor_user_id);
CREATE INDEX idx_project_contributions_payment_intent_id ON project_contributions(payment_intent_id);
CREATE INDEX idx_project_contributions_status ON project_contributions(status);
CREATE INDEX idx_project_contributions_created_at ON project_contributions(created_at DESC);


