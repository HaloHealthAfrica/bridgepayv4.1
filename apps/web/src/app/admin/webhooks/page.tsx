import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Search, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

function WebhookMonitorContent() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['webhooks', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/integrations/lemonade/webhook');
      if (!res.ok) {
        throw new Error(
          `Failed to fetch webhooks: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
  });

  const reprocess = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch('/api/integrations/lemonade/webhook/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to reprocess');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks', 'list'] });
      toast.success('Webhook reprocessed');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e.message || 'Failed to reprocess webhook');
    },
  });

  const events = data?.events || [];
  const filtered = useMemo(() => {
    return events.filter((e: any) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const txt = `${e.id} ${e.payment_id} ${e.transaction_id || ''}`.toLowerCase();
        if (!txt.includes(s)) return false;
      }
      return true;
    });
  }, [events, statusFilter, search]);

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    completed: 'success',
    failed: 'failed',
    pending: 'pending',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Webhook Events</h1>
          <p className="text-text-secondary">Monitor and manage webhook events</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 flex-1">
            <Search size={20} className="text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search (payment id or transaction id)"
              className="flex-1 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-text-secondary" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-semibold text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <Button
            variant="secondary"
            icon={RefreshCw}
            onClick={() => qc.invalidateQueries({ queryKey: ['webhooks', 'list'] })}
          >
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="bg-surface rounded-card p-8 text-center text-text-secondary">
            Loading…
          </div>
        )}
        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
            Failed to load events
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background min-w-[1000px]">
                <div>ID</div>
                <div>Created</div>
                <div>Payment</div>
                <div>Status</div>
                <div>Verified</div>
                <div>Transaction</div>
                <div>Actions</div>
              </div>
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-text-secondary">No events</div>
              ) : (
                filtered.map((e: any) => (
                  <div
                    key={e.id}
                    className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[1000px]"
                  >
                    <div className="text-sm font-mono">{e.id}</div>
                    <div className="text-sm whitespace-nowrap">
                      {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
                    </div>
                    <div className="text-sm font-semibold">{e.payment_id}</div>
                    <div>
                      <StatusPill status={statusMap[e.status] || 'pending'} />
                    </div>
                    <div className="text-sm">
                      {e.verified ? (
                        <span className="text-success font-semibold">Yes</span>
                      ) : (
                        <span className="text-text-secondary">No</span>
                      )}
                    </div>
                    <div className="text-sm font-mono">{e.transaction_id || '—'}</div>
                    <div>
                      <Button
                        variant="secondary"
                        icon={RotateCcw}
                        onClick={() => reprocess.mutate(e.id)}
                        disabled={reprocess.isPending}
                      >
                        Reprocess
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebhookMonitorPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <WebhookMonitorContent />
    </ProtectedRoute>
  );
}

