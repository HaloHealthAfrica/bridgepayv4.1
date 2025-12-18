/**
 * ProtectedRoute Component
 * Protects routes based on authentication and role requirements
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/utils/auth/useAuth';
import { getRequiredRole, ROLES } from '@/utils/auth/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[] | null;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = null,
  fallback = null 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, checkRole, checkAnyRole } = useAuth();
  const location = useLocation();
  
  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }
  
  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/account/signin" state={{ from: location }} replace />;
  }
  
  // Check role requirements
  if (requiredRole) {
    if (Array.isArray(requiredRole)) {
      // Multiple roles allowed
      if (!checkAnyRole(requiredRole)) {
        // Redirect to user's dashboard
        return <Navigate to="/dashboard" replace />;
      }
    } else {
      // Single role required
      if (!checkRole(requiredRole)) {
        // Redirect to user's dashboard
        return <Navigate to="/dashboard" replace />;
      }
    }
  } else {
    // Auto-detect required role from pathname
    const pathRole = getRequiredRole(location.pathname);
    if (pathRole && !checkRole(pathRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
}

