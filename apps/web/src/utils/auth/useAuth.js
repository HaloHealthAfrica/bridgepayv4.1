/**
 * Custom hook for authentication state and role checking
 */

import { useSession } from '@auth/create/react';
import { useMemo } from 'react';
import { ROLES, hasRole, hasAnyRole, getDashboardRoute } from './roles';

export function useAuth() {
  const { data: session, status } = useSession();
  
  const user = session?.user || null;
  const role = user?.role || ROLES.CUSTOMER;
  const isAuthenticated = status === 'authenticated' && !!user;
  const isLoading = status === 'loading';
  
  const checkRole = useMemo(() => {
    return (requiredRole) => hasRole(role, requiredRole);
  }, [role]);
  
  const checkAnyRole = useMemo(() => {
    return (requiredRoles) => hasAnyRole(role, requiredRoles);
  }, [role]);
  
  const dashboardRoute = useMemo(() => {
    return getDashboardRoute(role);
  }, [role]);
  
  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    checkRole,
    checkAnyRole,
    dashboardRoute,
    session,
  };
}

