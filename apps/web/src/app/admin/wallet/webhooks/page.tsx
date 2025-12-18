import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { RefreshCw, Eye } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminWalletWebhooksPage() {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ['admin-wallet-webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/admin/wallet/webhooks');
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
            <h1 className="text-3xl font-bold mb-2">Wallet Webhooks</h1>
            <p className="text-text-secondary">Latest 100 webhook payloads</p>
          </div>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => qc.invalidateQueries({ queryKey: ['admin-wallet-webhooks'] })}
          >
            Refresh
          </Button>
        </div>
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          {q.isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading...</div>
          ) : q.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 m-6 text-error">
              Could not load webhooks
            </div>
          ) : (q.data?.items || []).length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-text-secondary">No webhooks yet</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-5 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background min-w-[1000px]">
                <div>Received</div>
                <div>Type</div>
                <div>Order Ref</div>
                <div>Provider Tx</div>
                <div>Actions</div>
              </div>
              {(q.data?.items || []).map((r: any) => (
                <div key={r.id}>
                  <div
                    className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[1000px]"
                  >
                    <div className="text-sm whitespace-nowrap">
                      {new Date(r.received_at).toLocaleString()}
                    </div>
                    <div className="text-sm">{r.event_type}</div>
                    <div className="text-sm font-mono">{r.related_order_reference || '-'}</div>
                    <div className="text-sm font-mono">{r.related_provider_tx_id || '-'}</div>
                    <div>
                      <Button
                        variant="secondary"
                        icon={Eye}
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        {expandedId === r.id ? 'Hide' : 'View'}
                      </Button>
                    </div>
                  </div>
                  {expandedId === r.id && (
                    <div className="px-6 py-4 bg-background border-b border-[#E0E0E0]">
                      <div className="text-sm font-semibold mb-2">Payload</div>
                      <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words bg-surface p-4 rounded-xl overflow-x-auto">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

