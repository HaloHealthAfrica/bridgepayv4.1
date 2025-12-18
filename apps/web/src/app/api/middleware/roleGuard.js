/**
 * Role-Based Access Control Middleware
 * Provides utilities for protecting API routes based on user roles
 */

import { auth } from '@/auth';
import sql from '@/app/api/utils/sql';
import {
  errorResponse,
  ErrorCodes,
} from '@/app/api/utils/errorHandler';
import { ROLES, hasRole, hasAnyRole } from '@/utils/auth/roles';

/**
 * Get user role from session or database
 */
export async function getUserRole(userId) {
  if (!userId) return null;
  
  try {
    const rows = await sql`SELECT role FROM auth_users WHERE id = ${userId} LIMIT 1`;
    return rows?.[0]?.role || ROLES.CUSTOMER;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return ROLES.CUSTOMER;
  }
}

/**
 * Ensure user is authenticated
 */
export async function ensureAuthenticated(request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return {
      ok: false,
      response: errorResponse(ErrorCodes.UNAUTHORIZED, {
        message: 'Authentication required',
      }),
    };
  }
  
  return {
    ok: true,
    session,
  };
}

/**
 * Ensure user has a specific role
 */
export async function ensureRole(request, requiredRole) {
  const authResult = await ensureAuthenticated(request);
  if (!authResult.ok) {
    return authResult;
  }
  
  const session = authResult.session;
  let role = session.user.role;
  
  // Fetch role from database if not in session
  if (!role) {
    role = await getUserRole(session.user.id);
  }
  
  if (!hasRole(role, requiredRole)) {
    return {
      ok: false,
      response: errorResponse(ErrorCodes.FORBIDDEN, {
        message: `${requiredRole} access required`,
      }),
    };
  }
  
  return {
    ok: true,
    session,
    role,
  };
}

/**
 * Ensure user has any of the specified roles
 */
export async function ensureAnyRole(request, requiredRoles) {
  const authResult = await ensureAuthenticated(request);
  if (!authResult.ok) {
    return authResult;
  }
  
  const session = authResult.session;
  let role = session.user.role;
  
  // Fetch role from database if not in session
  if (!role) {
    role = await getUserRole(session.user.id);
  }
  
  if (!hasAnyRole(role, requiredRoles)) {
    return {
      ok: false,
      response: errorResponse(ErrorCodes.FORBIDDEN, {
        message: `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      }),
    };
  }
  
  return {
    ok: true,
    session,
    role,
  };
}

/**
 * Convenience functions for common role checks
 */
export const ensureAdmin = (request) => ensureRole(request, ROLES.ADMIN);
export const ensureMerchant = (request) => ensureRole(request, ROLES.MERCHANT);
export const ensureImplementer = (request) => ensureRole(request, ROLES.IMPLEMENTER);
export const ensureKYCVerifier = (request) => ensureRole(request, ROLES.KYC_VERIFIER);
export const ensureProjectVerifier = (request) => ensureRole(request, ROLES.PROJECT_VERIFIER);

/**
 * Ensure user is merchant or admin
 */
export const ensureMerchantOrAdmin = (request) => 
  ensureAnyRole(request, [ROLES.MERCHANT, ROLES.ADMIN]);

/**
 * Ensure user is project owner or implementer
 */
export const ensureProjectAccess = (request) =>
  ensureAnyRole(request, [ROLES.PROJECT_OWNER, ROLES.IMPLEMENTER, ROLES.ADMIN]);

