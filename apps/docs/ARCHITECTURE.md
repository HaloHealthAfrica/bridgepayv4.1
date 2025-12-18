# Architecture Overview

System architecture and design decisions for Bridge MVP v3.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Database Architecture](#database-architecture)
- [Payment Processing](#payment-processing)
- [Security Architecture](#security-architecture)
- [Deployment Architecture](#deployment-architecture)

## System Overview

Bridge MVP v3 is a full-stack payment platform built as a monolith with clear separation of concerns. The system handles:

- **User Authentication & Authorization**
- **Wallet Management** (multi-currency)
- **Payment Processing** (Stripe, M-Pesa, bank transfers)
- **Merchant Services** (invoicing, products, orders)
- **Admin Dashboard** (monitoring, analytics, disputes)

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
├──────────────────────┬───────────────────────────────────┤
│   Web App (React)    │   Mobile App (React Native)        │
│   React Router v7    │   Expo Router                     │
└──────────┬───────────┴──────────────┬─────────────────────┘
           │                         │
           │  HTTP/HTTPS             │
           │                         │
┌──────────▼─────────────────────────▼─────────────────────┐
│                  API Layer (Hono)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Auth    │  │  Wallet  │  │ Payments │              │
│  │  Routes  │  │  Routes  │  │  Routes  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Invoices │  │ Projects │  │  Admin   │              │
│  │  Routes  │  │  Routes  │  │  Routes  │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└──────────┬───────────────────────────────────────────────┘
           │
           │
┌──────────▼───────────────────────────────────────────────┐
│              Business Logic Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Wallet     │  │   Payment    │  │   Billing    │  │
│  │   Service    │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────┬───────────────────────────────────────────────┘
           │
           │
┌──────────▼───────────────────────────────────────────────┐
│              Data Access Layer                           │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  PostgreSQL  │  │   External    │                    │
│  │   Database   │  │    APIs       │                    │
│  └──────────────┘  └──────────────┘                    │
│         │                  │                             │
│         │                  ├── Stripe API                │
│         │                  ├── Lemonade Gateway         │
│         │                  └── M-Pesa API                │
└─────────┴──────────────────┴─────────────────────────────┘
```

## Technology Stack

### Frontend (Web)

- **React Router v7** - Full-stack React framework with SSR
- **React 18** - UI library
- **Hono** - Lightweight web framework for API routes
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management

### Frontend (Mobile)

- **Expo 54** - React Native framework
- **React Native 0.81.4** - Mobile UI framework
- **Expo Router** - File-based routing
- **TanStack Query** - Data fetching
- **Zustand** - State management

### Backend

- **Hono** - Web framework (lightweight, fast)
- **Auth.js** - Authentication library
- **Argon2** - Password hashing
- **PostgreSQL** - Primary database (Neon serverless)
- **Neon Serverless** - Serverless PostgreSQL driver

### Payment Processing

- **Stripe** - Card payment processing
- **Lemonade Gateway** - Custom gateway for M-Pesa integration
- **Multi-source funding** - Wallet, M-Pesa, bank transfers

### Development Tools

- **Vitest** - Test framework
- **TypeScript** - Type checking
- **ESLint** - Linting
- **Prettier** - Code formatting

## Application Architecture

### Request Flow

```
1. Client Request
   ↓
2. Hono Middleware
   ├── Request ID generation
   ├── CORS handling
   ├── Body parsing
   ├── CSRF validation
   └── Auth.js session check
   ↓
3. Route Handler
   ├── Input validation (Yup)
   ├── Business logic
   ├── Database queries
   └── External API calls
   ↓
4. Response
   ├── Success response
   └── Error response (standardized)
```

### Route Structure

```
/api/
├── auth/              # Authentication
│   ├── login
│   ├── signup
│   └── health
├── wallet/            # Wallet operations
│   ├── balance
│   ├── topup
│   ├── transfer
│   └── withdraw
├── payments/          # Payment processing
│   ├── intent
│   └── lemonade/
│       └── create
├── invoices/          # Invoice management
├── projects/          # Project management
└── admin/             # Admin endpoints
```

### Error Handling

All routes use centralized error handling:

```javascript
export const GET = withErrorHandling(async (request) => {
  // Route logic
  // Errors automatically caught and formatted
});
```

See [ERROR_HANDLING.md](ERROR_HANDLING.md) for details.

## Database Architecture

### Schema Design

- **Double-entry ledger** for financial transactions
- **Normalized structure** to prevent data duplication
- **Audit trails** for all financial operations
- **Indexes** for performance optimization

### Key Tables

```
auth_users
  ├── auth_sessions
  ├── auth_accounts
  └── wallets (1:many, per currency)

wallets
  └── wallet_ledger (double-entry)

payment_intents
  └── payment_idempotency

invoices
  └── invoice_items

orders
  ├── goods_escrows
  └── installments
```

See [database/README.md](../database/README.md) for complete schema.

### Transaction Management

Financial operations use database transactions:

```javascript
// Example: Wallet transfer
await sql.begin(async (sql) => {
  // Debit sender
  await sql`INSERT INTO wallet_ledger ...`;
  
  // Credit receiver
  await sql`INSERT INTO wallet_ledger ...`;
  
  // Update balances
  await sql`UPDATE wallets ...`;
});
```

## Payment Processing

### Payment Flow

```
1. Create Payment Intent
   ↓
2. Determine Funding Plan
   ├── Wallet balance
   ├── M-Pesa
   └── Bank transfer
   ↓
3. Execute Funding
   ├── Wallet: Direct debit
   ├── M-Pesa: Lemonade API
   └── Bank: External API
   ↓
4. Settlement
   ├── Update ledger
   ├── Apply fees
   └── Notify parties
```

### Multi-Source Funding

Payments can be split across multiple sources:

```json
{
  "funding_plan": [
    { "source": "wallet", "amount": 500.00 },
    { "source": "mpesa", "amount": 500.00 }
  ]
}
```

### Idempotency

All payment operations support idempotency keys to prevent duplicate processing:

```
Idempotency-Key: unique-key-per-request
```

## Security Architecture

### Authentication

- **Auth.js** with credentials provider
- **Argon2** password hashing
- **Session-based** authentication
- **Role-based** access control (customer, merchant, admin)

### Authorization

- **Middleware-based** route protection
- **Role checks** in route handlers
- **Resource ownership** validation

### Security Measures

- **CSRF protection** for state-changing operations
- **Password strength** requirements
- **Secure session** cookies (HttpOnly, Secure, SameSite)
- **Input validation** on all endpoints
- **SQL injection** prevention (parameterized queries)
- **Audit logging** for sensitive operations

See [SECURITY.md](SECURITY.md) for details.

## Deployment Architecture

### Current Setup (Monolith)

```
┌─────────────────────────────────────┐
│         Application Server          │
│  ┌──────────────────────────────┐ │
│  │   React Router (SSR)            │ │
│  │   + Hono API                   │ │
│  └──────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐          ┌─────▼─────┐
│  Neon  │          │  External  │
│   DB   │          │    APIs    │
└────────┘          └────────────┘
```

### Future Architecture (Resilience Patterns)

Planned improvements (Phase 3):

- **Message Queue** (BullMQ) for async processing
- **Circuit Breakers** for external services
- **Redis Caching** for performance
- **Health Checks** for monitoring
- **Graceful Degradation** for resilience

See [ARCHITECTURE_RESILIENCE_PLAN.md](../ARCHITECTURE_RESILIENCE_PLAN.md) for details.

## Data Flow Examples

### Wallet Top-Up

```
1. User initiates top-up
   ↓
2. Create funding session
   ↓
3. Call Lemonade API (M-Pesa)
   ↓
4. Webhook received
   ↓
5. Update wallet ledger
   ↓
6. Update balance
   ↓
7. Notify user
```

### Payment Processing

```
1. Create payment intent
   ↓
2. Validate funding plan
   ↓
3. Execute funding sources
   ├── Wallet: Direct
   ├── M-Pesa: API call
   └── Bank: API call
   ↓
4. Apply fees
   ↓
5. Update ledger
   ↓
6. Settle payment
   ↓
7. Send notifications
```

## Scalability Considerations

### Current Limitations

- **Monolithic architecture** - Single point of failure
- **Synchronous processing** - No async queue
- **No caching layer** - Direct database queries
- **Limited horizontal scaling** - Stateless but not optimized

### Planned Improvements

1. **Message Queue** - Async payment processing
2. **Caching Layer** - Redis for frequently accessed data
3. **Circuit Breakers** - Resilience for external APIs
4. **Health Checks** - Monitoring and alerting
5. **Load Balancing** - Multiple instances

## Performance Optimization

### Database

- **Indexes** on frequently queried columns
- **Connection pooling** via Neon
- **Query optimization** with EXPLAIN ANALYZE

### API

- **Response caching** (planned)
- **Pagination** for list endpoints
- **Lazy loading** for large datasets

### Frontend

- **Code splitting** via React Router
- **Image optimization** (planned)
- **Lazy loading** components

## Monitoring & Observability

### Current

- **Console logging** with request IDs
- **Error tracking** in development
- **Audit logs** in database

### Planned

- **Structured logging** (JSON format)
- **Metrics collection** (Prometheus)
- **Distributed tracing** (OpenTelemetry)
- **Error tracking** (Sentry)

## Future Architecture

See [ARCHITECTURE_RESILIENCE_PLAN.md](../ARCHITECTURE_RESILIENCE_PLAN.md) for detailed plans on:

- Microservices migration
- Event-driven architecture
- Service mesh
- Multi-region deployment

---

**Last Updated**: 2024-01-01

