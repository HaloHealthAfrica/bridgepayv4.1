import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { QuickAction } from '@/components/wallet/QuickAction';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { QrCode, Receipt, Download, BarChart3, DollarSign, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useWallet } from '@/hooks/useWallet';

function MerchantDashboardContent() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { walletData } = useWallet();

  // Fetch recent payments
  const paymentsQuery = useQuery({
    queryKey: ['merchant-payments'],
    queryFn: async () => {
      const res = await fetch('/api/payments/lemonade/recent?limit=10');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch payments');
      }
      const data = await res.json();
      // API returns { ok: true, payments } or { payments } format
      if (data.ok === false) {
        throw new Error(data.message || 'Failed to fetch payments');
      }
      return data.payments || data.items || [];
    },
  });

  // Calculate stats from payments
  const stats = useMemo(() => {
    const payments = paymentsQuery.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPayments = payments.filter((p: any) => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= today && p.status === 'completed';
    });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekPayments = payments.filter((p: any) => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= weekAgo && p.status === 'completed';
    });

    return {
      todaySales: todayPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      transactions: payments.length,
      thisWeek: weekPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
      balance: walletData?.balance || 0,
    };
  }, [paymentsQuery.data, walletData]);

  // Format recent payments for display
  const recentPayments = useMemo(() => {
    const payments = paymentsQuery.data || [];
    return payments.slice(0, 3).map((p: any) => {
      const date = new Date(p.created_at);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      
      let timeStr = '';
      if (diffMins < 60) {
        timeStr = `${diffMins} min ago`;
      } else if (diffHours < 24) {
        timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        timeStr = date.toLocaleDateString();
      }

      return {
        customer: p.metadata?.customer_name || 'Customer',
        amount: Number(p.amount || 0),
        item: p.metadata?.description || p.order_reference || 'Payment',
        time: timeStr,
        status: p.status,
      };
    });
  }, [paymentsQuery.data]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Merchant Dashboard 🏪</h1>
          <p className="text-text-secondary">Track sales and manage payments</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={DollarSign}
            label="Today's Sales"
            value={formatCurrency(stats.todaySales, 'KES')}
            color="primary"
            trend={12}
          />
          <StatCard
            icon={ShoppingBag}
            label="Transactions"
            value={stats.transactions}
            color="success"
            trend={8}
          />
          <StatCard
            icon={TrendingUp}
            label="This Week"
            value={formatCurrency(stats.thisWeek, 'KES')}
            color="success"
            trend={15}
          />
          <StatCard
            icon={Wallet}
            label="Balance"
            value={formatCurrency(stats.balance, 'KES')}
            color="primary"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <QuickAction
            icon={QrCode}
            label="My QR Code"
            onClick={() => navigate('/wallet/qr-pay')}
          />
          <QuickAction
            icon={Receipt}
            label="Payment Link"
            onClick={() => navigate('/payment-links/create')}
          />
          <QuickAction
            icon={Download}
            label="Withdraw"
            onClick={() => navigate('/merchant/withdraw')}
          />
          <QuickAction
            icon={BarChart3}
            label="Analytics"
            onClick={() => navigate('/merchant/analytics')}
          />
        </div>

        {/* Recent Payments */}
        <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Recent Payments</h2>
            <span
              className="text-primary text-sm cursor-pointer font-semibold"
              onClick={() => navigate('/merchant/payments')}
            >
              View All →
            </span>
          </div>
          {recentPayments.map((payment, i) => (
            <div
              key={i}
              className="flex justify-between items-center p-4 bg-background rounded-xl mb-2"
            >
              <div>
                <div className="font-semibold mb-1">{payment.customer}</div>
                <div className="text-sm text-text-secondary">{payment.item}</div>
                <div className="text-xs text-text-secondary">{payment.time}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-base text-success mb-1">
                  +{formatCurrency(payment.amount, 'KES')}
                </div>
                <StatusPill status="success" />
              </div>
            </div>
          ))}
        </div>

        {/* Sales Chart Placeholder */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <h2 className="text-lg font-bold mb-4">Sales Overview (Last 7 Days)</h2>
          <div className="h-[200px] bg-background rounded-xl flex items-center justify-center text-text-secondary">
            <div className="text-center">
              <BarChart3 size={48} className="text-text-secondary mx-auto mb-3" />
              <div>Sales chart visualization</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchantDashboardPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantDashboardContent />
    </ProtectedRoute>
  );
}

