import React from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { QuickAction } from '@/components/wallet/QuickAction';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import {
  Users,
  DollarSign,
  Briefcase,
  Activity,
  Shield,
  AlertTriangle,
  UserCheck,
  BarChart3,
  Settings,
  Users as UsersIcon,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

function AdminDashboardContent() {
  const navigate = useNavigate();

  // Fetch admin stats from API
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch admin stats');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch admin stats');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const stats = statsQuery.data || {
    totalUsers: 0,
    totalVolume: 0,
    activeProjects: 0,
    transactionsToday: 0,
    escrowBalance: 0,
    pendingReviews: 0,
    currency: 'KES',
  };
  const primaryCurrency = stats.currency || 'KES';

  const recentActivity = statsQuery.data?.recentActivity || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard ⚙️</h1>
          <p className="text-text-secondary">System overview and management</p>
        </div>

        {/* Stats Grid */}
        {statsQuery.isLoading ? (
          <div className="text-center py-8 text-text-secondary">Loading stats...</div>
        ) : statsQuery.error ? (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-8 text-error">
            Failed to load stats: {(statsQuery.error as Error).message}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total Users"
              value={stats.totalUsers?.toLocaleString() || '0'}
              color="primary"
            />
            <StatCard
              icon={DollarSign}
              label="Total Volume"
              value={formatCurrency(stats.totalVolume || 0, primaryCurrency)}
              color="success"
            />
            <StatCard
              icon={Briefcase}
              label="Active Projects"
              value={stats.activeProjects?.toString() || '0'}
              color="primary"
            />
            <StatCard
              icon={Activity}
              label="Transactions Today"
              value={stats.transactionsToday?.toLocaleString() || '0'}
              color="success"
            />
            <StatCard
              icon={Shield}
              label="Escrow Balance"
              value={formatCurrency(stats.escrowBalance || 0, primaryCurrency)}
              color="warning"
            />
            <StatCard
              icon={AlertTriangle}
              label="Pending Reviews"
              value={stats.pendingReviews?.toString() || '0'}
              color="warning"
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <QuickAction
            icon={UsersIcon}
            label="User Management"
            onClick={() => navigate('/admin/users')}
          />
          <QuickAction
            icon={UserCheck}
            label="KYC Approvals"
            onClick={() => navigate('/kyc-verifier/dashboard')}
            color="warning"
          />
          <QuickAction
            icon={Briefcase}
            label="Project Oversight"
            onClick={() => navigate('/projects')}
          />
          <QuickAction
            icon={BarChart3}
            label="Analytics"
            onClick={() => navigate('/admin/analytics')}
          />
          <QuickAction
            icon={Shield}
            label="Security Logs"
            onClick={() => navigate('/admin/security')}
          />
          <QuickAction
            icon={Settings}
            label="System Settings"
            onClick={() => navigate('/admin/settings')}
          />
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {statsQuery.isLoading ? (
            <div className="col-span-3 text-center py-8 text-text-secondary">Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-text-secondary">No recent activity</div>
          ) : (
          <div className="lg:col-span-2 bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h2 className="text-lg font-bold mb-4">Recent Platform Activity</h2>
            {recentActivity.map((activity: any, i: number) => {
              const getIcon = () => {
                if (activity.type === 'user') return Users;
                if (activity.type === 'project') return Briefcase;
                if (activity.type === 'payment') return DollarSign;
                return Activity;
              };
              const Icon = getIcon();
              const timeAgo = activity.time 
                ? new Date(activity.time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Recently';
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg mb-2"
                >
                  <div className="bg-primary-light rounded-lg p-2">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">{activity.text}</div>
                    <div className="text-xs text-text-secondary">{timeAgo}</div>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h2 className="text-lg font-bold mb-4">System Alerts</h2>

            <div className="bg-[#FFF3E0] rounded-xl p-4 mb-3 border-2 border-warning">
              <div className="flex gap-2 mb-2">
                <AlertTriangle size={18} className="text-warning" />
                <div className="font-semibold text-sm">High Volume Detected</div>
              </div>
              <div className="text-xs text-text-secondary">
                Transaction volume 40% above average
              </div>
            </div>

            <div className="bg-[#E8F5E9] rounded-xl p-4 mb-3 border-2 border-success">
              <div className="flex gap-2 mb-2">
                <CheckCircle size={18} className="text-success" />
                <div className="font-semibold text-sm">All Systems Operational</div>
              </div>
              <div className="text-xs text-text-secondary">
                99.9% uptime last 30 days
              </div>
            </div>

            <div className="bg-primary-light rounded-xl p-4">
              <div className="flex gap-2 mb-2">
                <Activity size={18} className="text-primary" />
                <div className="font-semibold text-sm">Peak Traffic Time</div>
              </div>
              <div className="text-xs text-text-secondary">
                Most active: 2-4 PM EAT
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

