# API Documentation

Complete API reference for Bridge MVP v3.

## Base URL

- **Development**: `http://localhost:4000`
- **Production**: `https://your-domain.com`

## Authentication

Most endpoints require authentication via session cookies. Include credentials in requests:

```javascript
fetch('/api/endpoint', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Response Format

### Success Response

```json
{
  "ok": true,
  ...data
}
```

### Error Response

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    "errors": {
      "field": "Validation error message"
    }
  }
}
```

## Error Codes

See [Error Handling Documentation](ERROR_HANDLING.md) for complete error code reference.

Common error codes:
- `unauthorized` (401) - Not authenticated
- `forbidden` (403) - Insufficient permissions
- `validation_error` (400) - Input validation failed
- `not_found` (404) - Resource not found
- `server_error` (500) - Internal server error

---

## Authentication Endpoints

### POST `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Errors:**
- `400` - Validation error (weak password, invalid email)
- `409` - Email already exists

---

### POST `/api/auth/login`

Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Validation error

---

## Wallet Endpoints

### GET `/api/wallet/balance`

Get wallet balance for authenticated user.

**Response:** `200 OK`
```json
{
  "ok": true,
  "balance": 1000.50,
  "currency": "KES",
  "pending": 50.00
}
```

---

### GET `/api/wallet/summary`

Get wallet summary with monthly changes.

**Response:** `200 OK`
```json
{
  "ok": true,
  "balance": 1000.50,
  "monthly_change": 250.00,
  "spent": 500.00,
  "received": 750.00
}
```

---

### POST `/api/wallet/topup`

Top up wallet balance.

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "KES",
  "source": "mpesa" // "mpesa", "kcb", "dtb"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "session_id": "uuid",
  "status": "pending"
}
```

---

### POST `/api/wallet/transfer`

Transfer funds to another user.

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "KES",
  "recipient_email": "recipient@example.com",
  "narration": "Payment for services"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "transaction_id": "uuid",
  "status": "completed"
}
```

**Errors:**
- `400` - Insufficient funds
- `404` - Recipient not found

---

### POST `/api/wallet/withdraw`

Request withdrawal from wallet.

**Request Body:**
```json
{
  "amount": 500.00,
  "currency": "KES",
  "destination": "mpesa",
  "phone_number": "+254712345678"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "withdrawal_id": "uuid",
  "status": "pending"
}
```

---

## Payment Endpoints

### POST `/api/payments/intent`

Create a payment intent.

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "KES",
  "merchant_id": "uuid",
  "funding_plan": [
    {
      "source": "wallet",
      "amount": 500.00
    },
    {
      "source": "mpesa",
      "amount": 500.00
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "payment_id": "uuid",
  "status": "PENDING",
  "amount_due": 1000.00
}
```

---

### POST `/api/payments/lemonade/create`

Create payment via Lemonade gateway (M-Pesa).

**Request Body:**
```json
{
  "amount": 1000.00,
  "currency": "KES",
  "phone_number": "+254712345678",
  "narration": "Payment for order"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "payment_id": "uuid",
  "status": "pending",
  "provider_response": {}
}
```

---

## Invoice Endpoints

### POST `/api/invoices`

Create a new invoice (merchant/admin only).

**Request Body:**
```json
{
  "customer_email": "customer@example.com",
  "items": [
    {
      "description": "Product 1",
      "qty": 2,
      "price": 500.00
    }
  ],
  "currency": "KES"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "invoice": {
    "id": "uuid",
    "total": 1000.00,
    "status": "pending"
  }
}
```

---

### GET `/api/invoices/[id]`

Get invoice details.

**Response:** `200 OK`
```json
{
  "ok": true,
  "invoice": {
    "id": "uuid",
    "total": 1000.00,
    "status": "paid",
    "items": [...]
  }
}
```

---

## Projects Endpoints

### GET `/api/projects`

List projects for authenticated user.

**Query Parameters:**
- `status` - Filter by status (`all`, `draft`, `active`, `completed`, `cancelled`)
- `q` - Search query

**Response:** `200 OK`
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "title": "Project Title",
      "description": "Project description",
      "status": "active",
      "current_amount": 5000.00,
      "target_amount": 10000.00,
      "currency": "KES"
    }
  ]
}
```

---

### POST `/api/projects`

Create a new project.

**Request Body:**
```json
{
  "title": "Project Title",
  "description": "Project description",
  "target_amount": 10000.00,
  "currency": "KES",
  "deadline": "2024-12-31",
  "category": "Technology",
  "location": "Nairobi, Kenya",
  "cover_image_url": "https://example.com/image.jpg"
}
```

**Response:** `200 OK`
```json
{
  "ok": true,
  "id": "uuid",
  "title": "Project Title",
  "status": "draft"
}
```

**Validation:**
- `title` - Required, min 3 characters
- `target_amount` - Required, >= 0
- `currency` - Defaults to "KES"
- `deadline` - Must be future date if provided
- `cover_image_url` - Must be valid URL if provided

---

## Activity Endpoints

### GET `/api/activity`

Get recent wallet activity.

**Query Parameters:**
- `limit` - Number of items (default: 20)
- `filter` - Filter by type (`all`, `sent`, `received`)

**Response:** `200 OK`
```json
{
  "ok": true,
  "items": [
    {
      "id": "uuid",
      "type": "credit",
      "amount": 1000.00,
      "currency": "KES",
      "status": "completed",
      "title": "Wallet credit",
      "time": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Admin Endpoints

All admin endpoints require `admin` role.

### GET `/api/admin/metrics/overview`

Get platform metrics overview.

**Response:** `200 OK`
```json
{
  "ok": true,
  "metrics": {
    "total_revenue": 100000.00,
    "total_transactions": 5000,
    "active_users": 1000
  }
}
```

---

### GET `/api/admin/wallet/ledger`

Get wallet ledger entries (admin view).

**Query Parameters:**
- `limit` - Number of entries
- `offset` - Pagination offset
- `user_id` - Filter by user

**Response:** `200 OK`
```json
{
  "ok": true,
  "entries": [...]
}
```

---

## Health Check

### GET `/api/health`

Check API health status.

**Response:** `200 OK`
```json
{
  "ok": true,
  "status": "healthy",
  "database": "connected"
}
```

---

## Rate Limiting

API endpoints may be rate-limited. Check response headers:

- `X-RateLimit-Limit` - Request limit per window
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

## Webhooks

### Wallet Webhooks

Webhook URL: `/api/wallet/webhook`

**Event Types:**
- `wallet.funded` - Wallet top-up completed
- `wallet.withdrawn` - Withdrawal completed
- `wallet.transferred` - Transfer completed

**Payload:**
```json
{
  "event_type": "wallet.funded",
  "wallet_id": "uuid",
  "amount": 1000.00,
  "currency": "KES",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `limit` - Items per page (default: 20, max: 100)
- `offset` - Pagination offset

**Response Headers:**
- `X-Total-Count` - Total number of items
- `X-Page-Count` - Total number of pages

---

## Idempotency

Payment and wallet operations support idempotency keys:

**Header:**
```
Idempotency-Key: unique-key-per-request
```

If the same key is used, the original response is returned.

---

## Examples

### JavaScript/TypeScript

```typescript
// Create payment intent
const response = await fetch('/api/payments/intent', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': 'unique-key-123',
  },
  body: JSON.stringify({
    amount: 1000.00,
    currency: 'KES',
    merchant_id: 'merchant-uuid',
  }),
});

const data = await response.json();
if (data.ok) {
  console.log('Payment created:', data.payment_id);
} else {
  console.error('Error:', data.error, data.message);
}
```

### cURL

```bash
# Get wallet balance
curl -X GET http://localhost:4000/api/wallet/balance \
  -H "Cookie: session=your-session-cookie"

# Create project
curl -X POST http://localhost:4000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "title": "My Project",
    "target_amount": 10000.00,
    "currency": "KES"
  }'
```

---

## Changelog

See [PROGRESS.md](../PROGRESS.md) for recent changes and updates.

