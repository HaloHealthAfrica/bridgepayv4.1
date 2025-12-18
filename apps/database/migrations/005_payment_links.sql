-- Migration: Payment Links
-- Description: Add payment_links table for shareable payment links
-- Date: 2024-01-01

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  amount NUMERIC(19, 4) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'KES',
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paid, cancelled, expired
  expires_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  payment_intent_id UUID REFERENCES payment_intents(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(code);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at ON payment_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_at ON payment_links(created_at);

-- Add constraint for currency
ALTER TABLE payment_links 
  ADD CONSTRAINT check_currency_length CHECK (LENGTH(currency) = 3);

-- Add constraint for status
ALTER TABLE payment_links 
  ADD CONSTRAINT check_status_values CHECK (status IN ('active', 'paid', 'cancelled', 'expired'));

-- Add constraint for amount
ALTER TABLE payment_links 
  ADD CONSTRAINT check_amount_positive CHECK (amount > 0);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_payment_links_updated_at
  BEFORE UPDATE ON payment_links
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_links_updated_at();

-- Comment on table
COMMENT ON TABLE payment_links IS 'Shareable payment links that users can generate and share';
COMMENT ON COLUMN payment_links.code IS 'Unique short code for the payment link (used in URL)';
COMMENT ON COLUMN payment_links.status IS 'Status: active (can be paid), paid (payment completed), cancelled (manually cancelled), expired (past expires_at)';
COMMENT ON COLUMN payment_links.metadata IS 'Additional metadata stored as JSON';

