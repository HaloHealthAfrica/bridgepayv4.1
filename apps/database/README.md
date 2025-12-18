# Database Schema Documentation

## Overview

This database uses PostgreSQL and follows a double-entry bookkeeping pattern for financial transactions. The schema is designed to support a payment platform with wallet management, invoicing, shopping, and escrow services.

## Database Structure

### Authentication & Users
- **auth_users**: User accounts
- **auth_sessions**: User sessions
- **auth_accounts**: OAuth accounts and credentials
- **auth_verification_token**: Email verification and password reset tokens

### Wallet System
- **wallets**: User wallet balances
- **wallet_ledger**: Double-entry ledger for all wallet transactions
- **wallet_sources**: Virtual payment sources (KCB, DTB, M-Pesa)
- **wallet_funding_sessions**: Top-up/funding sessions
- **wallet_withdrawals**: Withdrawal requests
- **wallet_webhook_events**: Webhook event log

### Payment Processing
- **payment_intents**: Payment intents with multi-source funding
- **payment_idempotency**: Idempotency keys for payment operations

### Billing & Fees
- **billing_ledger**: Platform fee and revenue tracking
- **billing_fee_catalog**: Fee definitions
- **merchant_fee_profiles**: Merchant-specific fee overrides

### Invoicing
- **invoices**: Merchant invoices
- **invoice_items**: Invoice line items

### Shopping
- **shops**: Merchant shops
- **products**: Shop products
- **orders**: Customer orders
- **goods_escrows**: Escrow accounts for orders
- **installments**: Installment payment plans

### QR Codes
- **qr_codes**: QR code payment links

### Audit
- **audit_logs**: Audit trail for actions

## Key Relationships

```
auth_users
  ├── auth_sessions (1:many)
  ├── auth_accounts (1:many)
  ├── wallets (1:many, per currency)
  ├── shops (1:many, if merchant)
  └── orders (1:many, as customer)

wallets
  ├── wallet_ledger (1:many)
  ├── wallet_funding_sessions (1:many)
  └── wallet_withdrawals (1:many)

shops
  └── products (1:many)

orders
  ├── goods_escrows (1:1, optional)
  └── installments (1:1, optional)

payment_intents
  └── billing_ledger (1:many, via transaction_id)
```

## Important Constraints

1. **Idempotency**: 
   - `wallet_ledger.ref` must be unique
   - `billing_ledger.ref` must be unique
   - `payment_idempotency.idempotency_key` is unique

2. **Double-Entry Bookkeeping**:
   - Every debit in `wallet_ledger` should have a corresponding credit
   - Wallet balances are updated atomically with ledger entries

3. **Currency**:
   - All amounts use `NUMERIC(19, 4)` for precision
   - Default currency is 'KES' (Kenyan Shilling)

## Indexes

All foreign keys and frequently queried columns are indexed for performance.

## Migration Strategy

1. Run `database/schema.sql` to create all tables
2. Use migration tool (Drizzle, Prisma, or raw SQL) for future changes
3. Always test migrations on a copy of production data first

## Seed Data

See `database/seeds/` directory for seed scripts.

## Backup Strategy

- Daily automated backups recommended
- Transaction log backups for point-in-time recovery
- Test restore procedures regularly



