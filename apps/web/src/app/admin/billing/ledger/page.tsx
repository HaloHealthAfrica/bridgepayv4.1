import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useQueryClient } from '@tanstack/react-query';

function AdminBillingLedgerContent() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-ledger-recent'],
    queryFn: async () => {
      const res = await fetch('/api/billing/ledger?limit=200');
      if (!res.ok)
        throw new Error(
          `Failed to fetch ledger: [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const rows = data?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Billing – Ledger</h1>
            <p className="text-text-secondary">Recent fee entries (last 200)</p>
          </div>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => qc.invalidateQueries({ queryKey: ['billing-ledger-recent'] })}
          >
            Refresh
          </Button>
        </div>
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 m-6 text-error">
              Could not load ledger
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-text-secondary">No entries yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background min-w-[1000px]">
                <div>When</div>
                <div>Type</div>
                <div>Tx Id</div>
                <div>Fee</div>
                <div className="text-right">Amount</div>
                <div>Payer</div>
                <div>Ref</div>
              </div>
              {rows.map((r: any) => (
                <div
                  key={r.id}
                  className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[1000px]"
                >
                  <div className="whitespace-nowrap text-sm">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm">{r.transaction_type}</div>
                  <div className="text-sm font-mono">{r.transaction_id}</div>
                  <div className="text-sm">{r.fee_code}</div>
                  <div className="text-right font-semibold">
                    {formatCurrency(r.amount || 0, 'KES')}
                  </div>
                  <div className="text-sm">{r.payer_account}</div>
                  <div className="text-sm text-text-secondary font-mono">{r.ref || '-'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

