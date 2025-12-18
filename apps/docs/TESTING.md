# Testing Guide

This document describes the testing infrastructure and how to write tests for Bridge MVP v3.

## Overview

The project uses **Vitest** for testing, which provides:
- Fast test execution
- ESM support
- Built-in coverage reporting
- Watch mode for development

## Test Structure

```
web/
├── test/
│   ├── setupTests.ts          # Global test setup
│   └── utils/
│       └── testHelpers.js     # Test utilities
├── src/
│   └── app/
│       └── api/
│           ├── __tests__/      # Integration tests
│           └── utils/
│               └── __tests__/ # Unit tests
└── vitest.config.ts            # Vitest configuration
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test projects.test.js

# Run tests matching a pattern
npm test -- --grep "errorHandler"
```

## Writing Tests

### Unit Tests

Unit tests focus on individual functions and utilities. They should be fast and not require external dependencies.

**Example: Testing Error Handler**

```javascript
import { describe, it, expect } from "vitest";
import { errorResponse, ErrorCodes } from "../errorHandler.js";

describe("errorHandler", () => {
  it("should create error response", async () => {
    const response = errorResponse(ErrorCodes.UNAUTHORIZED);
    const json = await response.json();
    
    expect(response.status).toBe(401);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("unauthorized");
  });
});
```

### Integration Tests

Integration tests verify that API routes work correctly with mocked dependencies.

**Example: Testing API Route**

```javascript
import { describe, it, expect, vi } from "vitest";
import { GET } from "../projects/route.js";
import { createMockRequest, expectSuccess } from "../../../test/utils/testHelpers.js";
import * as authModule from "@/auth";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/api/utils/sql", () => ({
  default: vi.fn(),
}));

describe("Projects API", () => {
  it("should return projects for authenticated user", async () => {
    // Setup mocks
    authModule.auth.mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
    });
    
    sql.mockResolvedValue([{ id: "project-1", title: "Test" }]);
    
    // Create request
    const request = createMockRequest({
      method: "GET",
      url: "http://localhost/api/projects",
    });
    
    // Execute
    const response = await GET(request);
    const json = await expectSuccess(response);
    
    // Assert
    expect(json.ok).toBe(true);
    expect(json.items).toBeDefined();
  });
});
```

## Test Utilities

### `testHelpers.js`

Provides common utilities for testing:

- **`createMockRequest(options)`** - Create a mock Request object
- **`createMockSession(options)`** - Create a mock session object
- **`createMockAuth(session)`** - Create a mock auth function
- **`expectSuccess(response, status)`** - Assert successful response
- **`expectError(response, errorCode, status)`** - Assert error response
- **`getJson(response)`** - Extract JSON from Response

## Mocking

### Mocking Auth

```javascript
import * as authModule from "@/auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// In test
authModule.auth.mockResolvedValue({
  user: { id: "user-123", email: "test@example.com" },
});
```

### Mocking Database

```javascript
import sql from "@/app/api/utils/sql";

vi.mock("@/app/api/utils/sql", () => ({
  default: vi.fn(),
}));

// In test
sql.mockResolvedValue([
  { id: "1", name: "Test" },
]);
```

### Mocking External Services

```javascript
import * as stripeModule from "@/__create/stripe";

vi.mock("@/__create/stripe", () => ({
  default: {
    createPaymentIntent: vi.fn(),
  },
}));

// In test
stripeModule.default.createPaymentIntent.mockResolvedValue({
  id: "pi_123",
  status: "succeeded",
});
```

## Test Database

For integration tests that require a real database:

1. Set `TEST_DATABASE_URL` environment variable
2. Or use `DATABASE_URL` with `_test` suffix automatically

```bash
# .env.test
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/bridge_test
```

**Note**: Tests should clean up after themselves. Use transactions or cleanup functions.

## Coverage

Coverage reports are generated in `coverage/` directory:

```bash
npm run test:coverage
```

Open `coverage/index.html` in a browser to view detailed coverage.

## Best Practices

1. **Keep tests fast** - Unit tests should be < 10ms, integration tests < 100ms
2. **Mock external dependencies** - Don't make real API calls or database queries
3. **Test error cases** - Verify error handling works correctly
4. **Use descriptive test names** - "should return 401 for unauthenticated requests"
5. **One assertion per test** - When possible, focus on one behavior
6. **Clean up mocks** - Use `beforeEach` to reset mocks between tests
7. **Test edge cases** - Empty inputs, null values, boundary conditions

## Example Test Files

- **Unit Tests**: `web/src/app/api/utils/__tests__/errorHandler.test.js`
- **Unit Tests**: `web/src/app/api/utils/__tests__/passwordValidation.test.js`
- **Integration Tests**: `web/src/app/api/__tests__/projects.test.js`

## CI/CD Integration

Tests run automatically in CI/CD pipelines. Add to your workflow:

```yaml
- name: Run tests
  run: npm test
```

## Troubleshooting

### Tests fail with "Cannot find module"
- Ensure `vitest.config.ts` has correct alias configuration
- Check that imports use `@/` alias correctly

### Mock not working
- Ensure `vi.mock()` is called before imports
- Check that module path matches exactly

### Database connection errors
- Set `TEST_DATABASE_URL` environment variable
- Ensure test database exists and is accessible

## Next Steps

- Add more unit tests for utility functions
- Add integration tests for critical payment flows
- Set up E2E tests with Playwright (future)

