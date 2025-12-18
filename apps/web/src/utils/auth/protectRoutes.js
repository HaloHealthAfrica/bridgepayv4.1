/**
 * Route Protection Helper
 * Use this to quickly protect routes with the correct role
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from './roles';

/**
 * Wrap a component with role-based protection
 */
export function protectRoute(Component, requiredRole) {
  return function ProtectedComponent(props) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Pre-configured protectors for common roles
 */
export const protectAdmin = (Component) => protectRoute(Component, ROLES.ADMIN);
export const protectMerchant = (Component) => protectRoute(Component, ROLES.MERCHANT);
export const protectImplementer = (Component) => protectRoute(Component, ROLES.IMPLEMENTER);
export const protectKYCVerifier = (Component) => protectRoute(Component, ROLES.KYC_VERIFIER);
export const protectProjectVerifier = (Component) => protectRoute(Component, ROLES.PROJECT_VERIFIER);
export const protectProjectOwner = (Component) => protectRoute(Component, ROLES.PROJECT_OWNER);
export const protectAuthenticated = (Component) => protectRoute(Component, null); // Just requires auth

