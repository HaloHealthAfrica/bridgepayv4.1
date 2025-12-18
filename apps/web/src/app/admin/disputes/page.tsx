import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Search, Filter, X, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useNavigate } from 'react-router';

function useDisputes({ status, q }: { status?: string; q?: string }) {
  return useQuery({
    queryKey: ['admin-disputes', { status, q }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (q) params.set('q', q);
      const res = await fetch(`/api/admin/disputes?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      // API returns { ok: true, disputes } or { disputes } format
      if (data.ok === false) {
        throw new Error(data.message || 'Failed to fetch disputes');
      }
      return data.disputes || [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function AdminDisputesContent() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const {
    data: disputes = [],
    isLoading,
    error,
  } = useDisputes({ status: status || undefined, q: q || undefined });
  const [selected, setSelected] = useState<any>(null);

  const openRow = async (id: number) => {
    const res = await fetch(`/api/admin/disputes/${id}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Failed to fetch dispute:', errorData.message || errorData.error);
      return;
    }
    const data = await res.json();
    // API returns { ok: true, ...dispute } or { ...dispute } format
    if (data.ok === false) {
      console.error('Failed to fetch dispute:', data.message);
      return;
    }
    setSelected(data);
  };

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    won: 'success',
    lost: 'failed',
    resolved: 'success',
    cancelled: 'failed',
    opened: 'pending',
    evidence_required: 'pending',
    under_review: 'pending',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Disputes</h1>
          <p className="text-text-secondary">Manage payment disputes</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <Search size={20} className="text-text-secondary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search external id"
                className="flex-1 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-text-secondary" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-semibold text-sm"
              >
                <option value="">All Status</option>
                <option value="opened">Opened</option>
                <option value="evidence_required">Evidence Required</option>
                <option value="under_review">Under Review</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          <div className="px-6 py-4 border-b bg-background font-semibold">Latest Disputes</div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-text-secondary text-center py-8">Loading…</div>
            ) : error ? (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
                {(error as Error).message || 'Failed to load disputes'}
              </div>
            ) : disputes.length === 0 ? (
              <div className="text-text-secondary text-center py-8">No disputes</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-5 gap-4 px-4 py-3 text-xs font-semibold text-text-secondary border-b bg-background min-w-[800px]">
                  <div>External ID</div>
                  <div>Amount</div>
                  <div>Status</div>
                  <div>Payment</div>
                  <div>Created</div>
                </div>
                {disputes.map((d: any) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-[#E0E0E0] hover:bg-background transition-colors cursor-pointer items-center min-w-[800px]"
                    onClick={() => openRow(d.id)}
                  >
                    <div className="font-mono text-xs break-all">{d.external_id}</div>
                    <div className="font-semibold">
                      {formatCurrency(d.amount || 0, d.currency || 'KES')}
                    </div>
                    <div>
                      <StatusPill status={statusMap[d.status] || 'pending'} />
                    </div>
                    <div className="text-sm">
                      {d.payment_id ? `#${d.payment_id}` : '-'}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {selected && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelected(null)}
          >
            <div
              className="bg-surface rounded-card max-w-4xl w-full p-6 border border-[#E0E0E0] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold">Dispute Details</div>
                <Button variant="secondary" icon={X} onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-background rounded-xl p-4 overflow-x-auto">
                  <div className="text-sm font-semibold mb-2">Dispute</div>
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                    {JSON.stringify(selected.dispute, null, 2)}
                  </pre>
                </div>
                <div className="bg-background rounded-xl p-4 overflow-x-auto">
                  <div className="text-sm font-semibold mb-2">Payment</div>
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                    {JSON.stringify(selected.payment, null, 2)}
                  </pre>
                </div>
              </div>
              {selected?.payment?.id && (
                <div className="mt-4 text-right">
                  <Button
                    variant="secondary"
                    icon={ExternalLink}
                    onClick={() => navigate(`/payments/receipt/${selected.payment.id}`)}
                  >
                    Open Receipt
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputesPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AdminDisputesContent />
    </ProtectedRoute>
  );
}

