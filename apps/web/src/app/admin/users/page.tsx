import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Search, Filter } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

function AdminUsersPageContent() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'pending' | 'merchants' | 'implementers' | 'suspended'>('all');

  // Fetch users from API
  const usersQuery = useQuery({
    queryKey: ['admin-users', searchQuery, filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (filter === 'merchants') params.set('role', 'merchant');
      else if (filter === 'implementers') params.set('role', 'implementer');
      else if (filter === 'verified') params.set('kyc_status', 'verified');
      else if (filter === 'pending') params.set('kyc_status', 'pending');
      
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch users');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const users = usersQuery.data?.items || [];

  const filteredUsers = useMemo(() => {
    if (filter === 'all') return users;
    if (filter === 'verified') return users.filter((u: any) => u.kyc === 'verified');
    if (filter === 'pending') return users.filter((u: any) => u.kyc !== 'verified');
    if (filter === 'merchants') return users.filter((u: any) => u.role === 'merchant');
    if (filter === 'implementers') return users.filter((u: any) => u.role === 'implementer');
    if (filter === 'suspended') return users.filter((u: any) => u.role === 'suspended');
    return users;
  }, [users, filter]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/admin')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-text-secondary">Search, view, and manage platform users</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
            <button className="px-6 py-3 border-2 border-[#E0E0E0] rounded-xl bg-white font-semibold cursor-pointer flex items-center gap-2 hover:bg-background transition-colors">
              <Filter size={20} />
              Filters
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              'All Users',
              'Verified',
              'Pending KYC',
              'Merchants',
              'Implementers',
              'Suspended',
            ].map((tab) => {
              const tabValue = tab.toLowerCase().replace(' ', '-') as typeof filter;
              const isActive =
                (tab === 'All Users' && filter === 'all') ||
                (tab !== 'All Users' && filter === tabValue);
              return (
                <button
                  key={tab}
                  onClick={() =>
                    setFilter(tab === 'All Users' ? 'all' : tabValue)
                  }
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'border-2 border-[#E0E0E0] bg-white text-text'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] overflow-x-auto">
          {usersQuery.isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading users...</div>
          ) : usersQuery.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
              Failed to load users: {(usersQuery.error as Error).message}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">No users found</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E0E0E0]">
                  <th className="p-3 text-left text-sm font-semibold">User</th>
                  <th className="p-3 text-left text-sm font-semibold">Role</th>
                  <th className="p-3 text-left text-sm font-semibold">KYC Status</th>
                  <th className="p-3 text-left text-sm font-semibold">Balance</th>
                  <th className="p-3 text-left text-sm font-semibold">Joined</th>
                  <th className="p-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-[#E0E0E0]">
                    <td className="p-4">
                      <div className="font-semibold mb-1">{user.name}</div>
                      <div className="text-sm text-text-secondary">{user.phone}</div>
                    </td>
                    <td className="p-4 text-sm capitalize">{user.role || 'customer'}</td>
                    <td className="p-4">
                      <StatusPill status={user.kyc === 'verified' ? 'success' : 'pending'} />
                    </td>
                    <td className="p-4 font-semibold">
                      {formatCurrency(user.balance || 0, 'KES')}
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{user.joined}</td>
                    <td className="p-4">
                      <button className="px-4 py-2 border-2 border-primary rounded-lg bg-white text-primary font-semibold cursor-pointer text-sm hover:bg-primary-light transition-colors">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AdminUsersPageContent />
    </ProtectedRoute>
  );
}

