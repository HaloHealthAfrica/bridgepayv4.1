import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { Download, RefreshCw, TrendingUp, Users, DollarSign, CheckCircle, FileText } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';
import { TransactionVolumeChart } from '@/components/analytics/TransactionVolumeChart';
import { UserGrowthChart } from '@/components/analytics/UserGrowthChart';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { PaymentSuccessChart } from '@/components/analytics/PaymentSuccessChart';

function AnalyticsContent() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/analytics?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
      return data;
    },
  });

  const handleExport = async (type: 'transactions' | 'users' | 'projects') => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${startDate || 'all'}_${endDate || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`${type} exported successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to export');
    }
  };

  const analytics = data || {};
  // Use primary currency from analytics or default to KES
  const primaryCurrency = analytics.primaryCurrency || 'KES';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-text-secondary">Platform metrics and insights</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => refetch()}
                disabled={isLoading}
              >
                Refresh
              </Button>
              {(startDate || endDate) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-text-secondary">Loading analytics...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                icon={TrendingUp}
                label="Transaction Volume"
                value={formatCurrency(analytics.transactionVolume || 0, primaryCurrency)}
                color="primary"
              />
              <StatCard
                icon={Users}
                label="Total Users"
                value={(analytics.totalUsers || 0).toLocaleString()}
                color="info"
                trend={analytics.newUsers30d ? ((analytics.newUsers30d / Math.max(analytics.totalUsers - analytics.newUsers30d, 1)) * 100) : undefined}
              />
              <StatCard
                icon={DollarSign}
                label="Revenue"
                value={formatCurrency(analytics.revenue || 0, primaryCurrency)}
                color="success"
              />
              <StatCard
                icon={CheckCircle}
                label="Success Rate"
                value={`${analytics.paymentSuccessRate || 0}%`}
                color="success"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <div className="text-sm text-text-secondary mb-2">Transaction Count</div>
                <div className="text-2xl font-bold">{(analytics.transactionCount || 0).toLocaleString()}</div>
              </div>
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <div className="text-sm text-text-secondary mb-2">Active Projects</div>
                <div className="text-2xl font-bold">{(analytics.activeProjects || 0).toLocaleString()}</div>
                <div className="text-xs text-text-secondary mt-1">
                  of {(analytics.totalProjects || 0).toLocaleString()} total
                </div>
              </div>
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <div className="text-sm text-text-secondary mb-2">New Users (30d)</div>
                <div className="text-2xl font-bold">{(analytics.newUsers30d || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Transaction Volume Chart */}
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <h2 className="text-xl font-bold mb-4">Transaction Volume Over Time</h2>
                {analytics.transactionsOverTime && analytics.transactionsOverTime.length > 0 ? (
                  <TransactionVolumeChart
                    data={analytics.transactionsOverTime}
                    currency={primaryCurrency}
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-text-secondary">
                    No transaction data available
                  </div>
                )}
              </div>

              {/* User Growth Chart */}
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <h2 className="text-xl font-bold mb-4">User Growth</h2>
                {analytics.userGrowth && analytics.userGrowth.length > 0 ? (
                  <UserGrowthChart data={analytics.userGrowth} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-text-secondary">
                    No user growth data available
                  </div>
                )}
              </div>

              {/* Revenue Chart */}
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <h2 className="text-xl font-bold mb-4">Revenue Over Time</h2>
                {analytics.revenueOverTime && analytics.revenueOverTime.length > 0 ? (
                  <RevenueChart
                    data={analytics.revenueOverTime}
                    currency={primaryCurrency}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-text-secondary">
                    No revenue data available
                  </div>
                )}
              </div>

              {/* Payment Success Chart */}
              <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
                <h2 className="text-xl font-bold mb-4">Payment Success Rate</h2>
                {analytics.totalPayments > 0 ? (
                  <PaymentSuccessChart
                    totalPayments={analytics.totalPayments}
                    successfulPayments={analytics.successfulPayments || 0}
                  />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-text-secondary">
                    No payment data available
                  </div>
                )}
              </div>
            </div>

            {/* Payment Stats */}
            <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
              <h2 className="text-xl font-bold mb-4">Payment Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-text-secondary mb-1">Total Payments</div>
                  <div className="text-lg font-semibold">{(analytics.totalPayments || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">Successful Payments</div>
                  <div className="text-lg font-semibold text-success">
                    {(analytics.successfulPayments || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-text-secondary mb-1">Success Rate</div>
                  <div className="text-lg font-semibold">
                    {analytics.paymentSuccessRate ? `${analytics.paymentSuccessRate.toFixed(2)}%` : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Section */}
            <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
              <h2 className="text-xl font-bold mb-4">Export Data</h2>
              <p className="text-sm text-text-secondary mb-4">
                Download data as CSV files. Date range filters apply to exports.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => handleExport('transactions')}
                >
                  Export Transactions
                </Button>
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => handleExport('users')}
                >
                  Export Users
                </Button>
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => handleExport('projects')}
                >
                  Export Projects
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

