import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { Plus, ExternalLink, FileText, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import useUser from '@/utils/useUser';

export default function MerchantInvoicesPage() {
  const { data: user, loading } = useUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: async () => {
      const res = await fetch('/api/invoices');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch invoices');
      }
      const data = await res.json();
      // API returns { ok: true, items, pagination } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch invoices');
      }
      return data;
    },
  });

  const markSent = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/invoices/${id}/mark-sent`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to mark as sent');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to mark as sent');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices-list'] });
      toast.success('Invoice marked as sent');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to mark invoice as sent');
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to cancel invoice');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to cancel invoice');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices-list'] });
      toast.success('Invoice cancelled');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to cancel invoice');
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-6">Loading…</div>
      </div>
    );
  }

  const role = user?.role;
  const allowed = role === 'admin' || role === 'merchant';
  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="p-6 text-error">Forbidden</div>
      </div>
    );
  }

  const invoices = data?.items || [];

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    paid: 'success',
    cancelled: 'failed',
    sent: 'pending',
    draft: 'pending',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Invoices</h1>
            <p className="text-text-secondary">Manage your invoices and payments</p>
          </div>
          <Button icon={Plus} onClick={() => navigate('/invoices/new')}>
            New Invoice
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-surface rounded-card p-8 text-center text-text-secondary">
            Loading…
          </div>
        ) : error ? (
          <div className="bg-[#FFEBEE] border border-error rounded-card p-4 text-error">
            {(error as Error).message || 'Failed to load invoices'}
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-surface rounded-card p-12 text-center border border-[#E0E0E0]">
            <FileText size={48} className="text-text-secondary mx-auto mb-4" />
            <div className="font-semibold text-text mb-2">No invoices yet</div>
            <div className="text-text-secondary mb-4">
              Create your first invoice to get started
            </div>
            <Button icon={Plus} onClick={() => navigate('/invoices/new')}>
              Create Invoice
            </Button>
          </div>
        ) : (
          <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">Customer</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {invoices.map((inv: any) => (
              <div
                key={inv.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-[#E0E0E0] hover:bg-background transition-colors items-center"
              >
                <div className="col-span-1 font-mono text-sm">#{inv.id}</div>
                <div className="col-span-3 text-sm">
                  {inv.customer_name || inv.customer_email || '-'}
                </div>
                <div className="col-span-2 font-semibold">
                  {formatCurrency(inv.total || 0, inv.currency || 'KES')}
                </div>
                <div className="col-span-2">
                  <StatusPill status={statusMap[inv.status] || 'pending'} />
                </div>
                <div className="col-span-2 text-sm text-text-secondary">
                  {new Date(inv.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => navigate(`/i/${inv.id}`)}
                    className="px-3 py-1.5 border-2 border-primary rounded-lg text-primary font-semibold text-sm hover:bg-primary-light transition-colors flex items-center gap-1"
                    title="Open hosted link"
                  >
                    <ExternalLink size={14} />
                    Link
                  </button>
                  <button
                    onClick={() => navigate(`/merchant/invoices/${inv.id}`)}
                    className="px-3 py-1.5 border-2 border-[#E0E0E0] rounded-lg text-text font-semibold text-sm hover:bg-background transition-colors"
                  >
                    Details
                  </button>
                  {inv.status === 'draft' && (
                    <button
                      onClick={() => markSent.mutate(inv.id)}
                      disabled={markSent.isPending}
                      className="px-3 py-1.5 border-2 border-warning rounded-lg text-warning font-semibold text-sm hover:bg-[#FFF3E0] transition-colors flex items-center gap-1"
                      title="Mark as sent"
                    >
                      <Send size={14} />
                    </button>
                  )}
                  {(inv.status === 'draft' || inv.status === 'sent') && (
                    <button
                      onClick={() => cancel.mutate(inv.id)}
                      disabled={cancel.isPending}
                      className="px-3 py-1.5 border-2 border-error rounded-lg text-error font-semibold text-sm hover:bg-[#FFEBEE] transition-colors"
                      title="Cancel invoice"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantInvoicesPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantInvoicesContent />
    </ProtectedRoute>
  );
}

