# Development Guide

Complete guide for setting up and developing Bridge MVP v3.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Database](#database)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **PostgreSQL** 14+ or access to Neon/Supabase
- **Git**

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
- **PostgreSQL client** (pgAdmin, DBeaver, or CLI)
- **API client** (Postman, Insomnia, or Thunder Client)

## Local Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd create-anything/_/apps
```

### 2. Environment Configuration

Create `.env` file in the `web/` directory:

```bash
cd web
cp .env.example .env  # Or create manually
```

Required variables (see [ENVIRONMENT.md](ENVIRONMENT.md)):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/bridge_dev

# Auth
AUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Application
NODE_ENV=development
APP_URL=http://localhost:4000
```

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Database Setup

**Option A: Using Neon/Supabase (Recommended)**

1. Create a new project
2. Copy connection string to `DATABASE_URL`
3. Run migrations:

```bash
psql $DATABASE_URL -f ../database/migrations/001_initial_schema.sql
```

**Option B: Local PostgreSQL**

```bash
# Create database
createdb bridge_dev

# Run migrations
psql bridge_dev -f database/migrations/001_initial_schema.sql

# Seed development data (optional)
node database/seeds/dev.js
```

### 4. Install Dependencies

```bash
# Web app
cd web
npm install

# Mobile app (optional)
cd ../mobile
npm install
```

### 5. Start Development Server

```bash
cd web
npm run dev
```

Access at: http://localhost:4000

### 6. Verify Setup

1. Visit http://localhost:4000
2. Sign up at `/account/signup`
3. Sign in at `/account/signin`
4. Access dashboard at `/dashboard`

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Creating a Feature

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes**
   - Write code
   - Write tests
   - Update documentation

3. **Run checks**
   ```bash
   npm test
   npm run typecheck
   npm run validate-env
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Test additions/changes
- `chore` - Maintenance tasks

**Examples:**
```
feat(wallet): add top-up functionality
fix(api): handle null wallet balance
docs: update API documentation
test(wallet): add integration tests
```

## Code Style

### JavaScript/TypeScript

- Use **ESLint** and **Prettier** (configured in project)
- Prefer **const** over let
- Use **arrow functions** for callbacks
- Use **async/await** over promises
- Use **template literals** for strings

**Example:**
```javascript
// Good
const fetchUser = async (userId) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
};

// Avoid
function fetchUser(userId) {
  return fetch('/api/users/' + userId).then(r => r.json());
}
```

### File Naming

- **Components**: PascalCase (`UserProfile.jsx`)
- **Utilities**: camelCase (`formatCurrency.js`)
- **Routes**: kebab-case (`user-profile.jsx`)
- **Tests**: `*.test.js` or `*.spec.js`

### Import Organization

```javascript
// 1. External dependencies
import { useState } from 'react';
import { Hono } from 'hono';

// 2. Internal modules
import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';

// 3. Relative imports
import { UserCard } from './UserCard';
```

### API Route Structure

```javascript
import { auth } from "@/auth";
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

  // Your logic here
  const data = await fetchData();

  return successResponse({ items: data });
});
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test projects.test.js
```

### Writing Tests

See [TESTING.md](TESTING.md) for detailed testing guide.

**Unit Test Example:**
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

**Integration Test Example:**
```javascript
import { describe, it, expect, vi } from "vitest";
import { GET } from "../projects/route.js";
import { createMockRequest, expectSuccess } from "../../../test/utils/testHelpers.js";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Projects API", () => {
  it("should return projects", async () => {
    // Setup mocks
    // Execute
    // Assert
  });
});
```

## Database

### Running Migrations

```bash
# Apply migration
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql

# Or use migration tool if available
npm run db:migrate
```

### Seeding Data

```bash
# Development seed
node database/seeds/dev.js

# Test seed (if available)
node database/seeds/test.js
```

### Database Queries

Use the `sql` utility:

```javascript
import sql from "@/app/api/utils/sql";

// Simple query
const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;

// Parameterized query
const rows = await sql("SELECT * FROM users WHERE id = $1", [userId]);
```

### Schema Changes

1. Update `database/schema.sql`
2. Create migration file in `database/migrations/`
3. Test migration on development database
4. Document changes in migration file

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── __tests__/    # Integration tests
│   │   │   ├── middleware/   # Middleware
│   │   │   └── utils/        # Utilities
│   │   │       └── __tests__/ # Unit tests
│   │   └── ...               # React Router pages
│   ├── auth.js               # Auth.js config
│   └── ...
├── __create/                 # Server entry
├── test/                    # Test utilities
└── package.json
```

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Logging

Use console logging (automatically includes request ID):

```javascript
console.log("Debug message", data);
console.error("Error occurred", error);
```

### Database Debugging

Enable query logging:

```javascript
// In sql.js (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('SQL Query:', query, params);
}
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 4000
lsof -i :4000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Verify network connectivity
4. Check firewall settings

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Type Errors

```bash
# Regenerate types
npm run typecheck

# Clear TypeScript cache
rm -rf .tsbuildinfo
```

### Test Failures

1. Check test database is set up
2. Verify environment variables
3. Check mocks are properly configured
4. Run tests in isolation: `npm test -- --run --reporter=verbose`

## Best Practices

1. **Write tests first** (TDD when possible)
2. **Keep functions small** and focused
3. **Use TypeScript** for type safety
4. **Document complex logic** with comments
5. **Follow error handling patterns** (see [ERROR_HANDLING.md](ERROR_HANDLING.md))
6. **Validate input** at API boundaries
7. **Use environment variables** for configuration
8. **Keep secrets out of code** (use .env)
9. **Review code** before merging
10. **Update documentation** with changes

## Resources

- [React Router Docs](https://reactrouter.com/)
- [Hono Docs](https://hono.dev/)
- [Vitest Docs](https://vitest.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Auth.js Docs](https://authjs.dev/)

---

**Happy coding! 🚀**

