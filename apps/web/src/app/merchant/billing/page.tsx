import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import useUser from '@/utils/useUser';

function MerchantBillingPageContent() {
  const { data: user, loading } = useUser();
  const merchantId = user?.email || null;

  const { data, isLoading, error } = useQuery({
    queryKey: ['merchant-fees', merchantId],
    queryFn: async () => {
      if (!merchantId) return { items: [] };
      const res = await fetch(
        `/api/billing/merchant-summary?merchantId=${encodeURIComponent(merchantId)}`,
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch merchant summary: [${res.status}] ${res.statusText}`,
        );
      }
      const data = await res.json();
      // API returns { ok: true, items } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch merchant summary');
      }
      return data;
    },
    enabled: !!merchantId,
    refetchOnWindowFocus: false,
  });

  const items = data?.items || [];
  const totalFees = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Billing & Fees</h1>
          <p className="text-text-secondary">Fees charged to your account</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            icon={DollarSign}
            label="Total Fees"
            value={formatCurrency(totalFees, 'KES')}
            color="primary"
          />
          <StatCard
            icon={Receipt}
            label="Fee Types"
            value={items.length.toString()}
            color="info"
          />
          <StatCard
            icon={TrendingUp}
            label="Active Currencies"
            value={new Set(items.map((i: any) => i.currency)).size.toString()}
            color="success"
          />
        </div>

        {/* Fees Table */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          {loading || isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 m-6 text-error">
              {(error as Error).message || 'Could not load billing data'}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={48} className="text-text-secondary mx-auto mb-4" />
              <div className="font-semibold text-text mb-2">No fees yet</div>
              <div className="text-text-secondary">
                Fees will appear here once transactions are processed
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background">
                <div>Fee Code</div>
                <div>Currency</div>
                <div className="text-right">Total</div>
              </div>
              {items.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-4 px-6 py-4 border-t border-[#E0E0E0] hover:bg-background transition-colors items-center"
                >
                  <div className="font-semibold">{r.fee_code || '-'}</div>
                  <div className="text-text-secondary">{r.currency || 'KES'}</div>
                  <div className="text-right font-bold text-lg">
                    {formatCurrency(r.total || 0, r.currency || 'KES')}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantBillingPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantBillingPageContent />
    </ProtectedRoute>
  );
}

