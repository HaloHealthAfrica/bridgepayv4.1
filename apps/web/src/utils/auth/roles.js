/**
 * Role-Based Access Control Utilities
 * Defines user roles and their permissions
 */

export const ROLES = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  IMPLEMENTER: 'implementer',
  PROJECT_OWNER: 'project-owner',
  KYC_VERIFIER: 'kyc-verifier',
  PROJECT_VERIFIER: 'project-verifier',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  [ROLES.CUSTOMER]: 'Customer',
  [ROLES.MERCHANT]: 'Merchant',
  [ROLES.IMPLEMENTER]: 'Implementer',
  [ROLES.PROJECT_OWNER]: 'Project Owner',
  [ROLES.KYC_VERIFIER]: 'KYC Verifier',
  [ROLES.PROJECT_VERIFIER]: 'Project Verifier',
  [ROLES.ADMIN]: 'Admin',
};

/**
 * Role hierarchy - higher roles inherit permissions from lower roles
 */
export const ROLE_HIERARCHY = {
  [ROLES.CUSTOMER]: 1,
  [ROLES.MERCHANT]: 2,
  [ROLES.IMPLEMENTER]: 3,
  [ROLES.PROJECT_OWNER]: 3,
  [ROLES.KYC_VERIFIER]: 4,
  [ROLES.PROJECT_VERIFIER]: 4,
  [ROLES.ADMIN]: 10,
};

/**
 * Default dashboard routes for each role
 */
export const ROLE_DASHBOARDS = {
  [ROLES.CUSTOMER]: '/dashboard',
  [ROLES.MERCHANT]: '/merchant/dashboard',
  [ROLES.IMPLEMENTER]: '/implementer/dashboard',
  [ROLES.PROJECT_OWNER]: '/projects',
  [ROLES.KYC_VERIFIER]: '/kyc-verifier/dashboard',
  [ROLES.PROJECT_VERIFIER]: '/project-verifier/dashboard',
  [ROLES.ADMIN]: '/admin',
};

/**
 * Check if a role has access to a resource
 */
export function hasRole(userRole, requiredRole) {
  if (!userRole) return false;
  if (userRole === requiredRole) return true;
  
  // Check hierarchy
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  // Admin has access to everything
  if (userRole === ROLES.ADMIN) return true;
  
  return userLevel >= requiredLevel;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(userRole, requiredRoles) {
  if (!userRole || !Array.isArray(requiredRoles)) return false;
  return requiredRoles.some(role => hasRole(userRole, role));
}

/**
 * Get dashboard route for a role
 */
export function getDashboardRoute(role) {
  return ROLE_DASHBOARDS[role] || ROLE_DASHBOARDS[ROLES.CUSTOMER];
}

/**
 * Check if route requires authentication
 */
export function isProtectedRoute(pathname) {
  const publicRoutes = [
    '/',
    '/account/signin',
    '/account/signup',
    '/account/logout',
    '/pay/link/',
    '/q/',
    '/i/',
  ];
  
  // Check if pathname matches any public route pattern
  return !publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return pathname.startsWith(route);
    }
    return pathname === route;
  });
}

/**
 * Check if route requires specific role
 */
export function getRequiredRole(pathname) {
  // Admin routes
  if (pathname.startsWith('/admin')) {
    return ROLES.ADMIN;
  }
  
  // Merchant routes
  if (pathname.startsWith('/merchant')) {
    return ROLES.MERCHANT;
  }
  
  // Implementer routes
  if (pathname.startsWith('/implementer')) {
    return ROLES.IMPLEMENTER;
  }
  
  // KYC Verifier routes
  if (pathname.startsWith('/kyc-verifier')) {
    return ROLES.KYC_VERIFIER;
  }
  
  // Project Verifier routes
  if (pathname.startsWith('/project-verifier')) {
    return ROLES.PROJECT_VERIFIER;
  }
  
  // Project routes (can be accessed by project-owner or implementer)
  if (pathname.startsWith('/projects')) {
    return null; // Multiple roles can access
  }
  
  // Default: requires authentication but no specific role
  return null;
}

