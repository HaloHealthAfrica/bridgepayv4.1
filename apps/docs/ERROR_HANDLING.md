# Error Handling Guide

This document describes the standardized error handling system used across the Bridge MVP v3 API.

## Overview

The error handling system provides:
- **Standardized error responses** with consistent format
- **Error codes** for programmatic error handling
- **Validation middleware** using Yup schemas
- **Automatic error logging** and debugging support

## Error Response Format

All error responses follow this format:

```json
{
  "ok": false,
  "error": "error_code",
  "message": "Human-readable error message (optional)",
  "details": {
    "errors": {
      "field1": "Validation error for field1",
      "field2": "Validation error for field2"
    },
    "summary": "Overall error summary"
  }
}
```

Success responses follow this format:

```json
{
  "ok": true,
  ...data
}
```

## Error Codes

### Authentication & Authorization
- `unauthorized` - User is not authenticated
- `forbidden` - User lacks required permissions
- `session_expired` - Session has expired

### Validation
- `validation_error` - Input validation failed
- `invalid_input` - Invalid input provided
- `missing_fields` - Required fields are missing
- `invalid_json` - Request body is not valid JSON

### Resources
- `not_found` - Resource not found
- `already_exists` - Resource already exists
- `conflict` - Resource conflict

### Business Logic
- `insufficient_funds` - Insufficient wallet balance
- `invalid_amount` - Invalid amount value
- `invalid_currency` - Invalid currency code
- `invalid_status` - Invalid status value

### External Services
- `external_service_error` - External service error
- `payment_gateway_error` - Payment gateway error

### Server
- `server_error` - Internal server error
- `database_error` - Database operation failed
- `timeout` - Request timeout

### Security
- `csrf_token_mismatch` - CSRF token validation failed
- `csrf_origin_mismatch` - CSRF origin validation failed

## Usage

### Basic Error Handling

```javascript
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

// Wrap your route handler
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Your logic here
  const data = await fetchData();

  return successResponse({ items: data });
});
```

### Custom Error Messages

```javascript
return errorResponse(ErrorCodes.INVALID_AMOUNT, {
  message: "Amount must be between 1 and 10000",
  details: {
    min: 1,
    max: 10000,
    provided: amount,
  },
});
```

### Validation with Yup

```javascript
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";

const createProjectSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .required("Title is required"),
  amount: CommonSchemas.amount,
  currency: CommonSchemas.currency,
  email: CommonSchemas.email,
});

export const POST = withErrorHandling(async (request) => {
  const body = await request.json();
  
  // Validate
  let validated;
  try {
    validated = await createProjectSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (validationError) {
    if (validationError.name === "ValidationError") {
      const errors = {};
      if (validationError.inner) {
        validationError.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
      }

      return errorResponse(ErrorCodes.VALIDATION_ERROR, {
        message: "Validation failed",
        details: {
          errors,
          summary: validationError.message,
        },
      });
    }
    throw validationError;
  }

  // Use validated data
  const project = await createProject(validated);
  return successResponse({ project });
});
```

### Using Validation Middleware (Hono)

For Hono routes, you can use the validation middleware:

```javascript
import { Hono } from "hono";
import { validateBody } from "@/app/api/middleware/validate";
import * as yup from "yup";

const app = new Hono();

const schema = yup.object({
  title: yup.string().required(),
  amount: yup.number().positive().required(),
});

app.post("/projects", validateBody(schema), async (c) => {
  const body = c.get("validatedBody"); // Validated and sanitized
  // Your logic here
  return c.json({ ok: true, project: body });
});
```

## Common Validation Schemas

The `CommonSchemas` object provides reusable validation schemas:

- `uuid` - UUID string validation
- `amount` - Positive number validation
- `currency` - 3-letter currency code (defaults to "KES")
- `email` - Email format validation
- `password` - Password strength validation (matches security requirements)
- `optionalString` - Optional string field
- `optionalNumber` - Optional number field
- `dateString` - ISO date string (YYYY-MM-DD)
- `url` - URL format validation

## Error Handling Best Practices

1. **Always use `withErrorHandling`** wrapper for route handlers
2. **Use appropriate error codes** from `ErrorCodes` enum
3. **Provide clear error messages** for user-facing errors
4. **Include validation details** when validation fails
5. **Don't expose internal errors** in production
6. **Log errors** for debugging (automatic in development)
7. **Use Yup schemas** for complex validation
8. **Validate early** - validate input before processing

## Migration Guide

### Before (Old Pattern)

```javascript
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return bad(401, "unauthorized");
    }
    // ...
  } catch (e) {
    return bad(500, "server_error");
  }
}
```

### After (New Pattern)

```javascript
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

export const POST = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }
  // ...
  return successResponse({ data });
});
```

## Examples

See `web/src/app/api/projects/route.js` for a complete example of:
- Using `withErrorHandling` wrapper
- Yup schema validation
- Standardized error responses
- Success responses


