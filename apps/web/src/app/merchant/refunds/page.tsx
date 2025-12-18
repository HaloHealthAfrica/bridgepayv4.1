import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

function useRefunds({ status }: { status?: string }) {
  return useQuery({
    queryKey: ['refunds', { status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('limit', '50');
      const res = await fetch(`/api/merchant/refunds?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed: ${res.status}`);
      }
      const data = await res.json();
      // API returns { ok: true, items, pagination } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch refunds');
      }
      return data.items || [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function useCreateRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/merchant/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Refund failed: ${res.status}`);
      }
      const data = await res.json();
      // API returns { ok: true, ... } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to create refund');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['refunds'] });
      toast.success('Refund created successfully');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to create refund');
    },
    retry: false,
  });
}

function MerchantRefundsContent() {
  const [status, setStatus] = useState('');
  const {
    data: refunds = [],
    isLoading,
    error,
  } = useRefunds({ status: status || undefined });
  const createRefund = useCreateRefund();

  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const onSubmit = async () => {
    const amt = Number(amount);
    const errs = [];
    if (!paymentId) errs.push('Payment ID is required');
    if (!amt || amt <= 0) errs.push('Amount must be > 0');
    if (errs.length) {
      toast.error(errs.join('\n'));
      return;
    }
    try {
      const body = {
        payment_id: Number(paymentId),
        amount: amt,
        reason: reason || undefined,
      };
      await createRefund.mutateAsync(body);
      // Reset form
      setPaymentId('');
      setAmount('');
      setReason('');
    } catch (e: any) {
      console.error(e);
    }
  };

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    succeeded: 'success',
    failed: 'failed',
    cancelled: 'failed',
    pending: 'pending',
    processing: 'pending',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Refunds</h1>
            <p className="text-text-secondary">Manage refunds for payments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-text-secondary" />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-2 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-semibold text-sm"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="succeeded">Succeeded</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Refunds List */}
          <div className="md:col-span-2">
            <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
              <div className="px-6 py-4 border-b bg-background font-semibold">Latest Refunds</div>
              <div className="p-6">
                {isLoading ? (
                  <div className="text-text-secondary text-center py-8">Loading…</div>
                ) : error ? (
                  <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
                    {(error as Error).message || 'Failed to load refunds'}
                  </div>
                ) : refunds.length === 0 ? (
                  <div className="text-text-secondary text-center py-8">No refunds yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 text-xs font-semibold text-text-secondary border-b bg-background">
                      <div>Refund ID</div>
                      <div>Payment</div>
                      <div>Amount</div>
                      <div>Status</div>
                      <div>Created</div>
                    </div>
                    {refunds.map((r: any) => (
                      <div
                        key={r.id}
                        className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center"
                      >
                        <div className="font-mono text-xs break-all">#{r.id}</div>
                        <div className="font-semibold">#{r.payment_id}</div>
                        <div className="font-semibold">
                          {formatCurrency(r.amount || 0, r.currency || 'KES')}
                        </div>
                        <div>
                          <StatusPill status={statusMap[r.status] || 'pending'} />
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Create Refund Form */}
          <div>
            <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 sticky top-24">
              <div className="text-lg font-bold mb-4">New Refund</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    Payment ID *
                  </label>
                  <input
                    value={paymentId}
                    onChange={(e) => setPaymentId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="e.g. 123"
                    type="number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">
                    Reason (optional)
                  </label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="Customer request"
                  />
                </div>
                <Button
                  icon={Plus}
                  onClick={onSubmit}
                  disabled={createRefund.isPending}
                  fullWidth
                >
                  {createRefund.isPending ? 'Processing…' : 'Create Refund'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchantRefundsPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantRefundsContent />
    </ProtectedRoute>
  );
}

