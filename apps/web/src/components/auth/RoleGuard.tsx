/**
 * RoleGuard Component
 * Conditionally renders content based on user role
 */

import React from 'react';
import { useAuth } from '@/utils/auth/useAuth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string | string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { checkRole, checkAnyRole, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }
  
  const hasAccess = Array.isArray(allowedRoles)
    ? checkAnyRole(allowedRoles)
    : checkRole(allowedRoles);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

