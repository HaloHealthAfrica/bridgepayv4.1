# Implementation Plan: Critical Fixes & New Features

**Date**: 2024-01-01  
**Priority**: High  
**Estimated Duration**: 3-4 weeks

---

## Overview

This plan addresses 5 critical improvements:
1. **Multi-Currency Support** (East African currencies)
2. **Error Handling Migration** (standardize all routes)
3. **Pagination Implementation** (all list endpoints)
4. **Code Quality Standardization** (consistent patterns)
5. **Payment Links Product** (new feature)

---

## 1. Multi-Currency Support (East African Currencies)

### Goal
Replace hardcoded "KES" with dynamic currency support for East African currencies:
- **KES** (Kenyan Shilling) - Primary
- **UGX** (Ugandan Shilling)
- **TZS** (Tanzanian Shilling)
- **RWF** (Rwandan Franc)
- **ETB** (Ethiopian Birr)

### Current Issues
- Currency hardcoded to "KES" in multiple files
- No currency selection in UI
- No currency validation
- No currency conversion (future enhancement)

### Implementation Steps

#### Phase 1.1: Currency Infrastructure (Day 1-2)

**Files to Create:**
- `web/src/app/api/utils/currencies.js` - Currency utilities
- `web/src/components/CurrencySelector.jsx` - Currency selector component
- `database/migrations/004_currency_support.sql` - Currency tables (if needed)

**Files to Modify:**
- `web/src/app/api/middleware/validate.js` - Update currency schema
- `web/src/app/api/wallet/_helpers.js` - Add currency parameter support

**Tasks:**
1. Create currency constants and validation
   ```javascript
   // web/src/app/api/utils/currencies.js
   export const SUPPORTED_CURRENCIES = ['KES', 'UGX', 'TZS', 'RWF', 'ETB'];
   export const DEFAULT_CURRENCY = 'KES';
   export const CURRENCY_NAMES = {
     KES: 'Kenyan Shilling',
     UGX: 'Ugandan Shilling',
     TZS: 'Tanzanian Shilling',
     RWF: 'Rwandan Franc',
     ETB: 'Ethiopian Birr',
   };
   ```

2. Update validation schema
   ```javascript
   // In validate.js
   currency: yup
     .string()
     .oneOf(SUPPORTED_CURRENCIES, `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`)
     .uppercase()
     .default(DEFAULT_CURRENCY),
   ```

3. Create currency selector component
   - Dropdown/select component
   - Display currency name and code
   - Store in user preferences (future)

#### Phase 1.2: Update Wallet Routes (Day 2-3)

**Files to Modify:**
- `web/src/app/api/wallet/balance/route.js` - Accept currency parameter
- `web/src/app/api/wallet/summary/route.js` - Multi-currency support
- `web/src/app/api/wallet/topup/route.js` - Currency parameter
- `web/src/app/api/wallet/transfer/route.js` - Currency parameter
- `web/src/app/api/wallet/withdraw/route.js` - Currency parameter
- `web/src/app/api/wallet/transactions/route.js` - Currency filter

**Changes:**
```javascript
// Example: wallet/balance/route.js
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const currency = (searchParams.get("currency") || DEFAULT_CURRENCY).toUpperCase();
  
  // Validate currency
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return errorResponse(ErrorCodes.INVALID_CURRENCY, {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
    });
  }

  const userId = session.user.id;
  // ... rest of logic
});
```

#### Phase 1.3: Update Payment Routes (Day 3-4)

**Files to Modify:**
- `web/src/app/api/payments/intent/route.js` - Currency parameter
- `web/src/app/api/payments/lemonade/create/route.js` - Currency support
- `web/src/app/api/invoices/route.js` - Currency in invoices
- `web/src/app/api/qr/generate/route.js` - Currency parameter

**Changes:**
- Add currency to payment intent creation
- Validate currency in all payment endpoints
- Update QR code generation to support currency

#### Phase 1.4: Update Frontend (Day 4-5)

**Files to Modify:**
- `web/src/app/wallet/page.jsx` - Add currency selector
- `web/src/app/payments/create/page.jsx` - Currency selection
- `web/src/app/invoices/create/page.jsx` - Currency selection
- All wallet/payment components

**Tasks:**
1. Add currency selector to relevant forms
2. Store selected currency in state/context
3. Pass currency to API calls
4. Display currency in UI

#### Phase 1.5: Database Updates (Day 5)

**Files to Modify:**
- `database/schema.sql` - Verify currency columns exist
- `database/migrations/004_currency_support.sql` - Add currency indexes if needed

**Tasks:**
1. Verify all currency columns are VARCHAR(3)
2. Add indexes on currency columns for performance
3. Add currency validation constraints

### Testing Checklist
- [ ] Can select different currencies in UI
- [ ] Wallet balance shows correct currency
- [ ] Payments work with all supported currencies
- [ ] Invoices can be created with different currencies
- [ ] QR codes support currency parameter
- [ ] Currency validation works (rejects invalid currencies)
- [ ] Default currency is KES when not specified

### Estimated Time: 5 days

---

## 2. Error Handling Migration

### Goal
Migrate all API routes to use `withErrorHandling` wrapper and standardized error responses.

### Current Issues
- Many routes use old error handling patterns
- Inconsistent error response formats
- Some routes use try-catch manually
- Mixed patterns: `Response.json()`, `errorResponse()`, custom `ok()`/`bad()` functions

### Routes Needing Migration

#### High Priority (Payment/Wallet Routes)
1. `web/src/app/api/invoices/route.js` - Uses old pattern
2. `web/src/app/api/billing/calculate/route.js` - Uses `bad()` function
3. `web/src/app/api/billing/ledger/route.js` - Uses `bad()` function
4. `web/src/app/api/billing/fees/route.js` - Uses `bad()` function
5. `web/src/app/api/shopping/products/route.js` - Uses `ok()` function
6. `web/src/app/api/shopping/shops/route.js` - Uses `ok()` function
7. `web/src/app/api/shopping/orders/route.js` - Needs verification
8. `web/src/app/api/qr/route.js` - Needs verification
9. `web/src/app/api/qr/generate/route.js` - Uses old pattern
10. `web/src/app/api/qr/pay/route.js` - Uses old pattern
11. `web/src/app/api/wallet/transactions/route.js` - Needs verification
12. `web/src/app/api/payments/scheduled/route.js` - Needs verification
13. `web/src/app/api/payments/lemonade/recent/route.js` - Needs verification
14. `web/src/app/api/merchant/refunds/route.js` - Uses old pattern

### Implementation Steps

#### Phase 2.1: Create Migration Helper (Day 1)

**Files to Create:**
- `web/src/app/api/utils/migrationHelper.js` - Helper to identify old patterns

**Tasks:**
1. Create script to find routes not using `withErrorHandling`
2. Document migration pattern
3. Create checklist

#### Phase 2.2: Migrate Payment/Wallet Routes (Day 2-3)

**Migration Pattern:**
```javascript
// OLD PATTERN
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
    // ... logic
    return Response.json({ ok: true, data });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}

// NEW PATTERN
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }
  // ... logic
  return successResponse({ data });
});
```

**Files to Migrate (Priority Order):**
1. `invoices/route.js` - High traffic
2. `billing/calculate/route.js` - Critical
3. `billing/ledger/route.js` - Admin route
4. `billing/fees/route.js` - Admin route
5. `wallet/transactions/route.js` - High traffic
6. `payments/scheduled/route.js` - Important
7. `merchant/refunds/route.js` - Important

#### Phase 2.3: Migrate Shopping Routes (Day 3-4)

**Files to Migrate:**
1. `shopping/products/route.js`
2. `shopping/shops/route.js`
3. `shopping/orders/route.js`

**Changes:**
- Replace `ok()` function with `successResponse()`
- Replace manual error handling with `withErrorHandling`
- Use `errorResponse()` for errors

#### Phase 2.4: Migrate QR Routes (Day 4)

**Files to Migrate:**
1. `qr/route.js`
2. `qr/generate/route.js`
3. `qr/pay/route.js`

**Changes:**
- Standardize error responses
- Use `withErrorHandling`
- Use proper error codes

#### Phase 2.5: Migrate Remaining Routes (Day 5)

**Files to Migrate:**
1. `payments/lemonade/recent/route.js`
2. Any other routes found

**Tasks:**
1. Review all routes
2. Migrate remaining routes
3. Update tests

### Migration Checklist Template
For each route:
- [ ] Import `withErrorHandling`, `errorResponse`, `successResponse`, `ErrorCodes`
- [ ] Wrap handler with `withErrorHandling`
- [ ] Replace `Response.json({ ok: false })` with `errorResponse()`
- [ ] Replace `Response.json({ ok: true })` with `successResponse()`
- [ ] Use proper error codes from `ErrorCodes`
- [ ] Remove manual try-catch (handled by wrapper)
- [ ] Update tests if needed
- [ ] Verify error responses match standard format

### Testing Checklist
- [ ] All routes return standardized error format
- [ ] Error codes are consistent
- [ ] Unauthorized requests return 401
- [ ] Validation errors return 400
- [ ] Server errors return 500
- [ ] Error messages are user-friendly
- [ ] Tests pass

### Estimated Time: 5 days

---

## 3. Pagination Implementation

### Goal
Add consistent pagination to all list endpoints using cursor-based pagination.

### Current Issues
- Some endpoints have no pagination (e.g., `invoices/route.js` - hardcoded LIMIT 50)
- Inconsistent pagination patterns (cursor vs offset)
- No pagination metadata in responses
- Some endpoints have pagination, others don't

### Endpoints Needing Pagination

#### High Priority
1. `GET /api/invoices` - Hardcoded LIMIT 50
2. `GET /api/projects` - No pagination
3. `GET /api/shopping/products` - Needs verification
4. `GET /api/shopping/orders` - Needs verification
5. `GET /api/payments/scheduled` - Needs verification
6. `GET /api/admin/wallet/ledger` - Needs verification

#### Already Have Pagination (Verify)
- `GET /api/activity` - Has limit, cursor-based
- `GET /api/merchant/refunds` - Has limit and cursor
- `GET /api/billing/ledger` - Has limit

### Implementation Steps

#### Phase 3.1: Create Pagination Utilities (Day 1)

**Files to Create:**
- `web/src/app/api/utils/pagination.js` - Pagination helpers

**Tasks:**
1. Create cursor-based pagination helper
2. Create pagination response formatter
3. Create pagination validation

```javascript
// web/src/app/api/utils/pagination.js
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function parsePaginationParams(searchParams) {
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") || DEFAULT_LIMIT))
  );
  const cursor = searchParams.get("cursor"); // ISO date string or ID
  
  return { limit, cursor };
}

export function createPaginationResponse(items, cursor, hasMore) {
  return {
    items,
    pagination: {
      cursor: cursor || null,
      hasMore: hasMore || false,
      limit: items.length,
    },
  };
}
```

#### Phase 3.2: Add Pagination Schema (Day 1)

**Files to Modify:**
- `web/src/app/api/middleware/validate.js`

**Tasks:**
1. Add pagination query schema
```javascript
export const PaginationSchema = yup.object({
  limit: yup
    .number()
    .integer()
    .min(1)
    .max(100)
    .default(DEFAULT_LIMIT),
  cursor: yup
    .string()
    .nullable()
    .default(null),
});
```

#### Phase 3.3: Implement Pagination in High-Priority Routes (Day 2-3)

**Files to Modify:**
1. `web/src/app/api/invoices/route.js`
   ```javascript
   export const GET = withErrorHandling(async (request) => {
     // ... auth check
     const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);
     
     let query = sql`SELECT * FROM invoices WHERE 1=1`;
     const params = [];
     
     if (cursor) {
       query = sql`${query} AND created_at < ${new Date(cursor)}`;
     }
     
     query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;
     const rows = await query;
     
     const hasMore = rows.length > limit;
     const items = hasMore ? rows.slice(0, limit) : rows;
     const nextCursor = hasMore ? items[items.length - 1].created_at.toISOString() : null;
     
     return successResponse(createPaginationResponse(items, nextCursor, hasMore));
   });
   ```

2. `web/src/app/api/projects/route.js` - Add pagination
3. `web/src/app/api/shopping/products/route.js` - Add pagination
4. `web/src/app/api/shopping/orders/route.js` - Add pagination

#### Phase 3.4: Standardize Existing Pagination (Day 3-4)

**Files to Modify:**
1. `web/src/app/api/billing/ledger/route.js` - Standardize
2. `web/src/app/api/merchant/refunds/route.js` - Standardize response format
3. `web/src/app/api/activity/route.js` - Add pagination metadata

**Tasks:**
1. Ensure all paginated endpoints return consistent format
2. Add pagination metadata
3. Use pagination utilities

#### Phase 3.5: Update Frontend (Day 4-5)

**Files to Modify:**
- All list components that fetch data

**Tasks:**
1. Update components to handle pagination
2. Add "Load More" or infinite scroll
3. Display pagination metadata
4. Handle cursor-based pagination

### Pagination Response Format
```json
{
  "ok": true,
  "items": [...],
  "pagination": {
    "cursor": "2024-01-01T00:00:00.000Z",
    "hasMore": true,
    "limit": 20
  }
}
```

### Testing Checklist
- [ ] All list endpoints support pagination
- [ ] Pagination parameters validated
- [ ] Cursor-based pagination works
- [ ] `hasMore` flag is accurate
- [ ] Frontend handles pagination correctly
- [ ] Performance is acceptable with large datasets
- [ ] Default limit is reasonable

### Estimated Time: 5 days

---

## 4. Code Quality Standardization

### Goal
Standardize code patterns, file structure, and coding conventions across the codebase.

### Current Issues
- Mixed JS/JSX and TypeScript
- Inconsistent error handling (being fixed)
- Inconsistent function patterns (`export async function` vs `export const GET =`)
- Mixed naming conventions
- Inconsistent imports
- No ESLint/Prettier configuration visible

### Implementation Steps

#### Phase 4.1: Establish Standards (Day 1)

**Files to Create:**
- `.eslintrc.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `docs/CODE_STYLE.md` - Code style guide

**Standards to Define:**
1. **File Extensions**: Use `.js` for JavaScript, `.jsx` for JSX, `.ts` for TypeScript
2. **Route Handlers**: Always use `export const GET = withErrorHandling(async (request) => {})`
3. **Naming**: camelCase for variables/functions, PascalCase for components
4. **Imports**: Group imports (external, internal, relative)
5. **Error Handling**: Always use `withErrorHandling` (being fixed)
6. **Response Format**: Always use `successResponse()` and `errorResponse()`

#### Phase 4.2: Standardize Route Handlers (Day 2-3)

**Pattern:**
```javascript
// Standard route handler pattern
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";

/**
 * GET /api/endpoint
 * Description
 * Query params: param1, param2
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  // ... logic

  return successResponse({ data });
});
```

**Tasks:**
1. Convert all `export async function GET` to `export const GET = withErrorHandling(async (request) => {})`
2. Standardize imports across all files
3. Add JSDoc comments to all routes
4. Remove custom helper functions (`ok()`, `bad()`, etc.)

#### Phase 4.3: Standardize Imports (Day 3-4)

**Import Order:**
1. External packages (React, libraries)
2. Internal utilities (@/app/api/utils)
3. Relative imports (./_helpers)
4. Types (if TypeScript)

**Example:**
```javascript
// External
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import * as yup from "yup";

// Internal utilities
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { CommonSchemas } from "@/app/api/middleware/validate";

// Relative
import { getOrCreateWallet } from "../_helpers";
```

**Tasks:**
1. Reorder imports in all files
2. Remove unused imports
3. Group imports consistently

#### Phase 4.4: Add Linting & Formatting (Day 4-5)

**Files to Create/Modify:**
- `.eslintrc.js`
- `.prettierrc`
- `package.json` - Add lint/format scripts

**Tasks:**
1. Configure ESLint
2. Configure Prettier
3. Add pre-commit hooks (optional)
4. Run linting on all files
5. Fix linting errors

**Scripts to Add:**
```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.jsx",
    "lint:fix": "eslint src --ext .js,.jsx --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,json,css,md}\""
  }
}
```

#### Phase 4.5: Documentation (Day 5)

**Files to Create:**
- `docs/CODE_STYLE.md` - Code style guide
- `docs/CONTRIBUTING.md` - Contribution guidelines

**Content:**
1. Code style rules
2. Naming conventions
3. File structure
4. Import order
5. Error handling patterns
6. Testing requirements

### Code Quality Checklist
- [ ] All route handlers use standard pattern
- [ ] All imports are ordered consistently
- [ ] All files have proper JSDoc comments
- [ ] ESLint configured and passing
- [ ] Prettier configured and applied
- [ ] No unused imports
- [ ] Consistent naming conventions
- [ ] Code style guide documented

### Testing Checklist
- [ ] Linting passes on all files
- [ ] Formatting is consistent
- [ ] No breaking changes
- [ ] All tests pass

### Estimated Time: 5 days

---

## 5. Payment Links Product

### Goal
Create a new "Payment Links" product that allows users to generate shareable payment links.

### Features
- Generate payment links with amount, description, currency
- Shareable URLs (e.g., `/pay/link/abc123`)
- Link expiration (optional)
- Payment tracking
- Email/SMS notifications (optional)
- Link management (view, cancel, resend)

### Implementation Steps

#### Phase 5.1: Database Schema (Day 1)

**Files to Create:**
- `database/migrations/005_payment_links.sql`

**Schema:**
```sql
CREATE TABLE payment_links (
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

CREATE INDEX idx_payment_links_user_id ON payment_links(user_id);
CREATE INDEX idx_payment_links_code ON payment_links(code);
CREATE INDEX idx_payment_links_status ON payment_links(status);
CREATE INDEX idx_payment_links_expires_at ON payment_links(expires_at);
```

#### Phase 5.2: API Routes (Day 2-3)

**Files to Create:**
1. `web/src/app/api/payment-links/route.js` - List and create
2. `web/src/app/api/payment-links/[id]/route.js` - Get, update, cancel
3. `web/src/app/api/payment-links/[id]/pay/route.js` - Process payment
4. `web/src/app/api/payment-links/[code]/public/route.js` - Public link info

**Routes:**
- `GET /api/payment-links` - List user's payment links
- `POST /api/payment-links` - Create payment link
- `GET /api/payment-links/[id]` - Get payment link details
- `PATCH /api/payment-links/[id]` - Update payment link
- `DELETE /api/payment-links/[id]` - Cancel payment link
- `GET /api/payment-links/[code]/public` - Public link info (no auth)
- `POST /api/payment-links/[code]/pay` - Pay via link

**Implementation:**
```javascript
// web/src/app/api/payment-links/route.js
import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas, PaginationSchema } from "@/app/api/middleware/validate";
import { nanoid } from "nanoid";

const createLinkSchema = yup.object({
  amount: CommonSchemas.amount,
  currency: CommonSchemas.currency,
  description: yup.string().max(500).optional(),
  expires_at: yup.date().nullable().optional(),
});

export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);
  
  let query = sql`
    SELECT * FROM payment_links
    WHERE user_id = ${session.user.id}
  `;
  
  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }
  
  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;
  const rows = await query;
  
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].created_at.toISOString() : null;
  
  return successResponse(createPaginationResponse(items, nextCursor, hasMore));
});

export const POST = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON);
  }

  const validated = await createLinkSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true,
  });

  const code = nanoid(12); // Short, unique code
  const link = await sql`
    INSERT INTO payment_links (
      user_id, code, amount, currency, description, expires_at, status
    ) VALUES (
      ${session.user.id},
      ${code},
      ${validated.amount},
      ${validated.currency},
      ${validated.description || null},
      ${validated.expires_at || null},
      'active'
    )
    RETURNING *
  `;

  return successResponse({
    link: link[0],
    url: `${process.env.APP_URL || ''}/pay/link/${code}`,
  });
});
```

#### Phase 5.3: Payment Processing (Day 3-4)

**Files to Create:**
- `web/src/app/api/payment-links/[code]/pay/route.js`

**Tasks:**
1. Create payment intent from link
2. Process payment (wallet, M-Pesa, etc.)
3. Update link status to "paid"
4. Send notifications

**Implementation:**
```javascript
export const POST = withErrorHandling(async (request, { params: { code } }) => {
  // Get link
  const link = await sql`
    SELECT * FROM payment_links
    WHERE code = ${code} AND status = 'active'
  `;
  
  if (!link[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment link not found or expired",
    });
  }

  // Check expiration
  if (link[0].expires_at && new Date(link[0].expires_at) < new Date()) {
    await sql`UPDATE payment_links SET status = 'expired' WHERE id = ${link[0].id}`;
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: "Payment link has expired",
    });
  }

  // Create payment intent
  const paymentIntent = await createPaymentIntent({
    amount: link[0].amount,
    currency: link[0].currency,
    description: link[0].description || `Payment for link ${code}`,
    metadata: {
      payment_link_id: link[0].id,
      payment_link_code: code,
    },
  });

  // Update link with payment intent
  await sql`
    UPDATE payment_links
    SET payment_intent_id = ${paymentIntent.id}
    WHERE id = ${link[0].id}
  `;

  return successResponse({
    payment_id: paymentIntent.id,
    redirect_url: `/pay/success/${paymentIntent.id}`,
  });
});
```

#### Phase 5.4: Frontend Pages (Day 4-5)

**Files to Create:**
1. `web/src/app/payment-links/page.jsx` - List payment links
2. `web/src/app/payment-links/create/page.jsx` - Create payment link
3. `web/src/app/payment-links/[id]/page.jsx` - Link details
4. `web/src/app/pay/link/[code]/page.jsx` - Public payment page

**Features:**
- Create link form (amount, currency, description, expiration)
- Link list with status
- Share button (copy link)
- Public payment page
- Payment processing

#### Phase 5.5: Integration & Notifications (Day 5)

**Files to Modify:**
- `lib/notifications/service.js` - Add payment link notifications

**Tasks:**
1. Send email when link is created
2. Send email when link is paid
3. Send email when link expires
4. Add to notification queue

### Payment Links Features
- ✅ Generate shareable links
- ✅ Set amount and currency
- ✅ Optional expiration
- ✅ Payment tracking
- ✅ Link management (view, cancel)
- ✅ Public payment page
- ✅ Email notifications
- ✅ Integration with payment system

### Testing Checklist
- [ ] Can create payment links
- [ ] Links are shareable
- [ ] Public page works without auth
- [ ] Payment processing works
- [ ] Link status updates correctly
- [ ] Expiration works
- [ ] Notifications sent
- [ ] Link management works

### Estimated Time: 5 days

---

## Implementation Timeline

### Week 1: Multi-Currency & Error Handling
- **Day 1-2**: Multi-currency infrastructure
- **Day 3-5**: Multi-currency implementation
- **Day 2-5**: Error handling migration (parallel)

### Week 2: Pagination & Code Quality
- **Day 1-2**: Pagination utilities and implementation
- **Day 3-5**: Code quality standardization
- **Day 4-5**: Linting and formatting

### Week 3: Payment Links
- **Day 1**: Database schema
- **Day 2-3**: API routes
- **Day 4-5**: Frontend and integration

### Week 4: Testing & Polish
- **Day 1-2**: Testing all features
- **Day 3**: Bug fixes
- **Day 4-5**: Documentation and deployment prep

---

## Success Criteria

### Multi-Currency
- ✅ All supported currencies work
- ✅ Currency selection in UI
- ✅ No hardcoded "KES" references
- ✅ Currency validation

### Error Handling
- ✅ All routes use `withErrorHandling`
- ✅ Standardized error responses
- ✅ Consistent error codes

### Pagination
- ✅ All list endpoints paginated
- ✅ Consistent pagination format
- ✅ Frontend handles pagination

### Code Quality
- ✅ Consistent patterns
- ✅ ESLint/Prettier configured
- ✅ Code style guide documented

### Payment Links
- ✅ Can create and share links
- ✅ Payment processing works
- ✅ Link management works
- ✅ Notifications sent

---

## Dependencies

- **Multi-Currency**: None (infrastructure exists)
- **Error Handling**: None
- **Pagination**: None
- **Code Quality**: ESLint, Prettier packages
- **Payment Links**: Existing payment system

---

## Risks & Mitigation

### Risk 1: Breaking Changes
- **Mitigation**: Test thoroughly, migrate incrementally

### Risk 2: Currency Conversion
- **Mitigation**: Start with currency selection only, conversion later

### Risk 3: Performance Impact
- **Mitigation**: Add indexes, test with large datasets

### Risk 4: Migration Complexity
- **Mitigation**: Migrate routes one at a time, test after each

---

## Notes

- All changes should be backward compatible where possible
- Test each phase before moving to next
- Update documentation as features are added
- Consider feature flags for gradual rollout

---

**Last Updated**: 2024-01-01  
**Status**: Ready for Implementation

