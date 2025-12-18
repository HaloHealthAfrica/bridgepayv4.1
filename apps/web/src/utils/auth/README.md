# Authentication & Authorization System

This directory contains the authentication and role-based access control (RBAC) system for BridgePay.

## Overview

The authentication system provides:
- User authentication via credentials (email/password)
- Role-based access control (RBAC)
- Protected routes (frontend and API)
- Session management with role information

## User Roles

The system supports the following roles:

- **customer** - Default role, wallet and payment access
- **merchant** - Can create invoices, manage products, process refunds
- **implementer** - Can work on projects and submit milestones
- **project-owner** - Can create and manage projects
- **kyc-verifier** - Can verify KYC documents
- **project-verifier** - Can verify project milestones
- **admin** - Full platform access, disputes, metrics, diagnostics

## Usage

### Frontend Components

#### ProtectedRoute Component

Protect routes based on authentication and role:

```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';

// Protect route - requires authentication
<ProtectedRoute>
  <YourComponent />
</ProtectedRoute>

// Protect route - requires specific role
<ProtectedRoute requiredRole={ROLES.ADMIN}>
  <AdminComponent />
</ProtectedRoute>

// Protect route - allows multiple roles
<ProtectedRoute requiredRole={[ROLES.MERCHANT, ROLES.ADMIN]}>
  <MerchantComponent />
</ProtectedRoute>
```

#### RoleGuard Component

Conditionally render content based on role:

```tsx
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/auth/roles';

<RoleGuard allowedRoles={ROLES.ADMIN}>
  <AdminOnlyButton />
</RoleGuard>

<RoleGuard allowedRoles={[ROLES.MERCHANT, ROLES.ADMIN]}>
  <MerchantFeature />
</RoleGuard>
```

#### useAuth Hook

Access authentication state and role information:

```tsx
import { useAuth } from '@/utils/auth/useAuth';
import { ROLES } from '@/utils/auth/roles';

function MyComponent() {
  const { 
    user, 
    role, 
    isAuthenticated, 
    isLoading,
    checkRole,
    checkAnyRole,
    dashboardRoute 
  } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;
  
  if (checkRole(ROLES.ADMIN)) {
    return <AdminView />;
  }
  
  return <RegularView />;
}
```

### API Route Protection

#### Using Role Guard Middleware

```javascript
import { ensureRole, ensureAnyRole, ensureAuthenticated } from '@/app/api/middleware/roleGuard';
import { ROLES } from '@/utils/auth/roles';
import { withErrorHandling } from '@/app/api/utils/errorHandler';

// Require specific role
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureRole(request, ROLES.ADMIN);
  if (!guard.ok) {
    return guard.response;
  }
  
  // guard.session contains the authenticated session
  // guard.role contains the user's role
  
  // Your route logic here
  return successResponse({ data: '...' });
});

// Require any of multiple roles
export const POST = withErrorHandling(async (request) => {
  const guard = await ensureAnyRole(request, [ROLES.MERCHANT, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }
  
  // Your route logic here
});

// Just require authentication
export const PUT = withErrorHandling(async (request) => {
  const guard = await ensureAuthenticated(request);
  if (!guard.ok) {
    return guard.response;
  }
  
  // Your route logic here
});
```

#### Convenience Functions

```javascript
import { 
  ensureAdmin,
  ensureMerchant,
  ensureMerchantOrAdmin,
  ensureProjectAccess 
} from '@/app/api/middleware/roleGuard';

// Admin only
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) return guard.response;
  // ...
});

// Merchant or Admin
export const POST = withErrorHandling(async (request) => {
  const guard = await ensureMerchantOrAdmin(request);
  if (!guard.ok) return guard.response;
  // ...
});
```

## Role Hierarchy

Roles have a hierarchy system where higher roles inherit permissions:

- Customer: 1
- Merchant: 2
- Implementer/Project Owner: 3
- KYC Verifier/Project Verifier: 4
- Admin: 10 (has access to everything)

## Dashboard Routes

Each role has a default dashboard route:

- Customer: `/dashboard`
- Merchant: `/merchant/dashboard`
- Implementer: `/implementer/dashboard`
- Project Owner: `/projects`
- KYC Verifier: `/kyc-verifier/dashboard`
- Project Verifier: `/project-verifier/dashboard`
- Admin: `/admin`

After login, users are automatically redirected to their role-specific dashboard.

## Session Management

User roles are included in the session token and available via:

- Frontend: `useAuth()` hook
- API: `auth()` function returns session with `user.role`

If role is not in session, it's fetched from the database automatically.

## Security Notes

1. **Always verify roles server-side** - Frontend role checks are for UX only
2. **Use middleware for API routes** - Don't manually check roles in every route
3. **Default to least privilege** - New users default to 'customer' role
4. **Role changes require re-authentication** - Role updates require new session

