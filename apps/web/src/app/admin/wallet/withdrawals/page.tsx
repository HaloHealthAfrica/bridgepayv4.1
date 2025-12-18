import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminWalletWithdrawalsPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['admin-wallet-withdrawals'],
    queryFn: async () => {
      const res = await fetch('/api/admin/wallet/withdrawals');
      if (!res.ok) throw new Error(`Fetch failed [${res.status}]`);
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Withdrawals</h1>
            <p className="text-text-secondary">Latest 100 withdrawals</p>
          </div>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => qc.invalidateQueries({ queryKey: ['admin-wallet-withdrawals'] })}
          >
            Refresh
          </Button>
        </div>
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          {q.isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : q.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 m-6 text-error">
              Could not load withdrawals
            </div>
          ) : (q.data?.items || []).length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-text-secondary">No withdrawals yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background min-w-[900px]">
                <div>Time</div>
                <div>User</div>
                <div>Method</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Order Ref</div>
              </div>
              {(q.data?.items || []).map((r: any) => (
                <div
                  key={r.id}
                  className="grid grid-cols-6 gap-4 px-6 py-4 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[900px]"
                >
                  <div className="text-sm whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm">{r.user_email || '-'}</div>
                  <div className="text-sm">{r.method}</div>
                  <div className="font-semibold">
                    {formatCurrency(r.amount || 0, 'KES')}
                  </div>
                  <div className="text-sm">{r.status}</div>
                  <div className="text-sm text-text-secondary font-mono">
                    {r.order_reference || '-'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

