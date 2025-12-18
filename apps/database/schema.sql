-- Bridge MVP v3 Database Schema
-- PostgreSQL Database Schema
-- Generated from codebase analysis

-- ============================================================================
-- AUTHENTICATION TABLES
-- ============================================================================

-- Users table (Auth.js compatible)
CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    role TEXT DEFAULT 'customer', -- 'customer', 'merchant', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_role ON auth_users(role);

-- Sessions table (Auth.js compatible)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_session_token ON auth_sessions("sessionToken");
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions("userId");

-- Accounts table (Auth.js compatible - for OAuth providers and credentials)
CREATE TABLE IF NOT EXISTS auth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    access_token TEXT,
    expires_at BIGINT,
    refresh_token TEXT,
    id_token TEXT,
    scope TEXT,
    session_state TEXT,
    token_type TEXT,
    password TEXT, -- For credentials provider (hashed with Argon2)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, "providerAccountId")
);

CREATE INDEX idx_auth_accounts_user_id ON auth_accounts("userId");
CREATE INDEX idx_auth_accounts_provider ON auth_accounts(provider, "providerAccountId");

-- Verification tokens (for email verification, password reset, etc.)
CREATE TABLE IF NOT EXISTS auth_verification_token (
    identifier TEXT NOT NULL,
    token TEXT NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- ============================================================================
-- WALLET TABLES
-- ============================================================================

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    currency TEXT NOT NULL DEFAULT 'KES',
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0,
    available_balance NUMERIC(19, 4) DEFAULT 0,
    reserved_balance NUMERIC(19, 4) DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_currency ON wallets(currency);

-- Wallet ledger (double-entry bookkeeping)
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    counterparty_wallet_id UUID REFERENCES wallets(id),
    entry_type TEXT NOT NULL, -- 'debit' or 'credit'
    amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'posted', -- 'posted', 'pending', 'cancelled'
    ref TEXT NOT NULL UNIQUE, -- Idempotency key
    external_ref TEXT, -- External transaction reference
    narration TEXT,
    metadata JSONB DEFAULT '{}',
    balance_after NUMERIC(19, 4), -- Balance after this entry
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ
);

CREATE INDEX idx_wallet_ledger_wallet_id ON wallet_ledger(wallet_id);
CREATE INDEX idx_wallet_ledger_ref ON wallet_ledger(ref);
CREATE INDEX idx_wallet_ledger_external_ref ON wallet_ledger(external_ref);
CREATE INDEX idx_wallet_ledger_created_at ON wallet_ledger(created_at DESC);

-- Wallet sources (virtual sources like KCB, DTB, M-Pesa)
CREATE TABLE IF NOT EXISTS wallet_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- 'kcb', 'dtb', 'mpesa', 'bridge'
    currency TEXT NOT NULL DEFAULT 'KES',
    balance NUMERIC(19, 4) NOT NULL DEFAULT 0,
    hold NUMERIC(19, 4) NOT NULL DEFAULT 0, -- Amount on hold
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'closed'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, source, currency)
);

CREATE INDEX idx_wallet_sources_user_id ON wallet_sources(user_id);
CREATE INDEX idx_wallet_sources_source ON wallet_sources(source);

-- Wallet funding sessions (top-ups)
CREATE TABLE IF NOT EXISTS wallet_funding_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    method TEXT NOT NULL, -- 'mpesa', 'bank', 'card'
    amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'cancelled'
    provider TEXT, -- 'lemonade', 'stripe', etc.
    order_reference TEXT,
    provider_tx_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_funding_sessions_wallet_id ON wallet_funding_sessions(wallet_id);
CREATE INDEX idx_wallet_funding_sessions_user_id ON wallet_funding_sessions(user_id);
CREATE INDEX idx_wallet_funding_sessions_status ON wallet_funding_sessions(status);
CREATE INDEX idx_wallet_funding_sessions_order_ref ON wallet_funding_sessions(order_reference);
CREATE INDEX idx_wallet_funding_sessions_provider_tx_id ON wallet_funding_sessions(provider_tx_id);

-- Wallet withdrawals
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    method TEXT NOT NULL, -- 'mpesa', 'bank'
    destination TEXT NOT NULL, -- Phone number, account number, etc.
    amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'succeeded', 'failed', 'cancelled'
    provider TEXT, -- 'lemonade', etc.
    order_reference TEXT,
    provider_tx_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_withdrawals_wallet_id ON wallet_withdrawals(wallet_id);
CREATE INDEX idx_wallet_withdrawals_user_id ON wallet_withdrawals(user_id);
CREATE INDEX idx_wallet_withdrawals_status ON wallet_withdrawals(status);
CREATE INDEX idx_wallet_withdrawals_order_ref ON wallet_withdrawals(order_reference);
CREATE INDEX idx_wallet_withdrawals_provider_tx_id ON wallet_withdrawals(provider_tx_id);

-- Wallet webhook events (for tracking webhook calls)
CREATE TABLE IF NOT EXISTS wallet_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'payment_succeeded', 'payment_failed', 'payment_update', 'unauthorized'
    related_order_reference TEXT,
    related_provider_tx_id TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_webhook_events_event_type ON wallet_webhook_events(event_type);
CREATE INDEX idx_wallet_webhook_events_order_ref ON wallet_webhook_events(related_order_reference);
CREATE INDEX idx_wallet_webhook_events_provider_tx_id ON wallet_webhook_events(related_provider_tx_id);

-- ============================================================================
-- PAYMENT TABLES
-- ============================================================================

-- Payment intents
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES auth_users(id), -- Merchant user ID
    amount_due NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'FUNDED_PENDING_SETTLEMENT', 'SETTLED', 'FAILED', 'CANCELLED'
    funding_plan JSONB, -- Array of funding sources
    provider_response JSONB, -- Response from payment provider
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_intents_user_id ON payment_intents(user_id);
CREATE INDEX idx_payment_intents_merchant_id ON payment_intents(merchant_id);
CREATE INDEX idx_payment_intents_status ON payment_intents(status);
CREATE INDEX idx_payment_intents_created_at ON payment_intents(created_at DESC);

-- Payment idempotency (to prevent duplicate payments)
CREATE TABLE IF NOT EXISTS payment_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    payment_id UUID REFERENCES payment_intents(id),
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BILLING TABLES
-- ============================================================================

-- Billing ledger (platform fees and revenue)
CREATE TABLE IF NOT EXISTS billing_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL, -- 'MERCHANT_PAYMENT', 'PROJECT', 'INSTALLMENT_PAY', etc.
    transaction_id TEXT NOT NULL, -- Reference to payment_intent, order, etc.
    fee_code TEXT NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    payer_account UUID REFERENCES wallets(id), -- Who pays the fee
    platform_account UUID REFERENCES wallets(id), -- Platform wallet
    direction TEXT NOT NULL, -- 'IN' or 'OUT'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'posted', 'cancelled'
    ref TEXT NOT NULL UNIQUE, -- Idempotency key
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posted_at TIMESTAMPTZ
);

CREATE INDEX idx_billing_ledger_transaction ON billing_ledger(transaction_type, transaction_id);
CREATE INDEX idx_billing_ledger_status ON billing_ledger(status);
CREATE INDEX idx_billing_ledger_ref ON billing_ledger(ref);

-- Billing fee catalog (fee definitions)
CREATE TABLE IF NOT EXISTS billing_fee_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Fee code identifier
    name TEXT NOT NULL,
    applies_to TEXT NOT NULL, -- Transaction type this fee applies to
    fee_type TEXT NOT NULL, -- 'flat', 'percentage', 'tiered'
    amount NUMERIC(19, 4), -- For flat fees
    rate NUMERIC(10, 6), -- For percentage fees (e.g., 0.025 for 2.5%)
    tiers JSONB, -- For tiered fees
    payer TEXT NOT NULL, -- 'customer', 'merchant', 'platform'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    effective_start TIMESTAMPTZ,
    effective_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_fee_catalog_applies_to ON billing_fee_catalog(applies_to);
CREATE INDEX idx_billing_fee_catalog_status ON billing_fee_catalog(status);

-- Merchant fee profiles (merchant-specific fee overrides)
CREATE TABLE IF NOT EXISTS merchant_fee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    fee_code TEXT NOT NULL,
    overrides JSONB, -- Override fee_type, rate, amount, tiers
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(merchant_id, fee_code)
);

CREATE INDEX idx_merchant_fee_profiles_merchant_id ON merchant_fee_profiles(merchant_id);

-- ============================================================================
-- INVOICE TABLES
-- ============================================================================

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email TEXT,
    customer_phone TEXT,
    customer_name TEXT,
    due_date TIMESTAMPTZ,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'cancelled', 'overdue'
    subtotal NUMERIC(19, 4) NOT NULL DEFAULT 0,
    tax NUMERIC(19, 4) NOT NULL DEFAULT 0,
    total NUMERIC(19, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer_email ON invoices(customer_email);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
    price NUMERIC(19, 4) NOT NULL,
    description TEXT,
    line_total NUMERIC(19, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- ============================================================================
-- SHOPPING TABLES
-- ============================================================================

-- Shops
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shops_merchant_user_id ON shops(merchant_user_id);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    stock INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_shop_id ON products(shop_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    customer_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    total_amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    payment_mode TEXT NOT NULL, -- 'PAY_NOW', 'DELIVER_THEN_COLLECT', 'INSTALLMENT_PAY_AFTER'
    status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT', -- 'PENDING_PAYMENT', 'IN_ESCROW', 'COMPLETED', 'CANCELLED'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_customer_user_id ON orders(customer_user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order items (implied from code, but not explicitly seen - may be in metadata)
-- Consider adding: order_items table if needed

-- Goods escrows (for escrow payments)
CREATE TABLE IF NOT EXISTS goods_escrows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    hold_amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'funded', -- 'funded', 'released', 'cancelled'
    release_condition TEXT, -- Condition for release
    escrow_wallet_id UUID REFERENCES wallets(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id)
);

CREATE INDEX idx_goods_escrows_order_id ON goods_escrows(order_id);
CREATE INDEX idx_goods_escrows_status ON goods_escrows(status);

-- Installments (for installment payment plans)
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    total_amount NUMERIC(19, 4) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    num_legs INTEGER NOT NULL,
    leg_amount NUMERIC(19, 4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_installments_order_id ON installments(order_id);
CREATE INDEX idx_installments_customer_user_id ON installments(customer_user_id);
CREATE INDEX idx_installments_status ON installments(status);

-- ============================================================================
-- PROJECTS TABLES
-- ============================================================================

-- Projects (for project management/fundraising)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed', 'cancelled'
    current_amount NUMERIC(19, 4) NOT NULL DEFAULT 0, -- Amount raised/collected
    target_amount NUMERIC(19, 4) NOT NULL DEFAULT 0, -- Target/goal amount
    currency TEXT NOT NULL DEFAULT 'KES',
    deadline TIMESTAMPTZ,
    category TEXT,
    location TEXT,
    cover_image_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- ============================================================================
-- QR CODE TABLES
-- ============================================================================

-- QR codes
CREATE TABLE IF NOT EXISTS qr_codes (
    code TEXT PRIMARY KEY, -- QR code identifier
    mode TEXT NOT NULL, -- Payment mode
    amount NUMERIC(19, 4),
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired', 'disabled'
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_qr_codes_status ON qr_codes(status);
CREATE INDEX idx_qr_codes_expires_at ON qr_codes(expires_at);

-- ============================================================================
-- AUDIT TABLES
-- ============================================================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth_users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE auth_users IS 'User accounts for authentication';
COMMENT ON TABLE wallets IS 'User wallets for storing balances';
COMMENT ON TABLE wallet_ledger IS 'Double-entry ledger for all wallet transactions';
COMMENT ON TABLE payment_intents IS 'Payment intents with multi-source funding plans';
COMMENT ON TABLE billing_ledger IS 'Platform fee and revenue tracking';
COMMENT ON TABLE invoices IS 'Merchant invoices';
COMMENT ON TABLE orders IS 'Shopping orders';
COMMENT ON TABLE goods_escrows IS 'Escrow accounts for order payments';
COMMENT ON TABLE projects IS 'User projects for tracking and fundraising';


