import React from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { QuickAction } from '@/components/wallet/QuickAction';
import { TransactionRow } from '@/components/wallet/TransactionRow';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ArrowUpRight, ArrowDownLeft, QrCode, Wallet, DollarSign, TrendingUp, History } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';

function DashboardContent() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { walletData, loading: walletLoading } = useWallet();
  const { transactions, loading: transactionsLoading } = useTransactions(5);

  // Recent activity query
  const activityQuery = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const res = await fetch('/api/activity?limit=10');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch activity');
      }
      const data = await res.json();
      // API returns { ok: true, items } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch activity');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const balance = walletData?.balance || 0;
  const monthlyChange = walletData?.monthlyChange || 0;
  const spent = walletData?.spent || 0;

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-text-secondary">Manage your money with ease</p>
        </div>

        {/* Wallet Card */}
        <div
          className="bg-gradient-to-br from-primary to-[#004D40] rounded-card p-8 text-white shadow-lg mb-6"
          style={{
            boxShadow: '0 4px 12px rgba(0,121,107,0.2)',
          }}
        >
          <div className="text-sm opacity-90 mb-2">Total Balance</div>
          <div className="text-4xl md:text-5xl font-bold mb-5">
            {formatCurrency(balance, walletData?.currency || 'KES')}
          </div>
          <div className="flex gap-8 text-sm flex-wrap">
            <div>
              <div className="opacity-80 mb-1">Available</div>
              <div className="font-semibold text-lg">
                {formatCurrency(balance, walletData?.currency || 'KES')}
              </div>
            </div>
            <div>
              <div className="opacity-80 mb-1">Pending</div>
              <div className="font-semibold text-lg">
                {formatCurrency(walletData?.pending || 0, walletData?.currency || 'KES')}
              </div>
            </div>
            <div>
              <div className="opacity-80 mb-1">In Escrow</div>
              <div className="font-semibold text-lg">
                {formatCurrency(walletData?.escrow || 0, walletData?.currency || 'KES')}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <QuickAction
            icon={ArrowDownLeft}
            label="Add Money"
            onClick={() => navigate('/wallet/add-money')}
          />
          <QuickAction
            icon={ArrowUpRight}
            label="Send Money"
            onClick={() => navigate('/wallet/send-money')}
          />
          <QuickAction
            icon={QrCode}
            label="QR Pay"
            onClick={() => navigate('/wallet/qr-pay')}
          />
          <QuickAction
            icon={History}
            label="History"
            onClick={() => navigate('/wallet/history')}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={Wallet}
            label="This Month"
            value={formatCurrency(balance, walletData?.currency || 'KES')}
            color="primary"
            trend={monthlyChange > 0 ? monthlyChange : undefined}
          />
          <StatCard
            icon={DollarSign}
            label="Spent"
            value={formatCurrency(spent, walletData?.currency || 'KES')}
            color="warning"
          />
          <StatCard
            icon={TrendingUp}
            label="Growth"
            value={`${monthlyChange > 0 ? '+' : ''}${monthlyChange}%`}
            color="success"
            trend={monthlyChange}
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <a
              href="/wallet/history"
              className="text-primary text-sm font-semibold hover:underline"
            >
              View All →
            </a>
          </div>
          {transactionsLoading ? (
            <div className="space-y-2">
              <div className="h-16 bg-background rounded-xl animate-pulse" />
              <div className="h-16 bg-background rounded-xl animate-pulse" />
              <div className="h-16 bg-background rounded-xl animate-pulse" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              No recent activity
            </div>
          ) : (
            <div>
              {transactions.slice(0, 5).map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={{
                    id: transaction.id,
                    type: transaction.type,
                    title: transaction.title,
                    amount: transaction.amount,
                    date: transaction.date,
                    status: transaction.status,
                    currency: transaction.currency,
                  }}
                  onClick={() => navigate(`/payments/receipt/${transaction.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

