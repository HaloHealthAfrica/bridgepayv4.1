/**
 * Example Protected Admin Page
 * This demonstrates how to use ProtectedRoute component
 */

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Navigation } from '@/components/common/Navigation';

function AdminContent() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Protected Admin Page</h1>
        <p className="text-text-secondary">
          This page is only accessible to admin users.
        </p>
      </div>
    </div>
  );
}

export default function AdminProtectedPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AdminContent />
    </ProtectedRoute>
  );
}

