import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { ArrowLeft, ExternalLink, Send, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import useUser from '@/utils/useUser';

function MerchantInvoiceDetailContent(props: any) {
  const { id } = useParams();
  const { data: user, loading } = useUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const invQ = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Invoice not found');
      return res.json();
    },
  });

  const payQ = useQuery({
    queryKey: ['invoice-payments', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}/payments`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      return res.json();
    },
  });

  const markSent = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/mark-sent`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to mark as sent');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices-list'] });
      toast.success('Invoice marked as sent');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to mark invoice as sent');
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to cancel invoice');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] });
      qc.invalidateQueries({ queryKey: ['invoices-list'] });
      toast.success('Invoice cancelled');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to cancel invoice');
    },
  });

  const sendEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      toast.success('Email sent');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to send email');
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

  const inv = invQ.data?.invoice;
  const items = invQ.data?.items || [];
  const payments = payQ.data?.payments || [];

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    paid: 'success',
    cancelled: 'failed',
    sent: 'pending',
    draft: 'pending',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/merchant/invoices')}>
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                Invoice {inv ? `#${inv.id}` : ''}
              </h1>
              <p className="text-text-secondary">View invoice details and payments</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={ExternalLink}
              onClick={() => navigate(`/i/${id}`)}
            >
              Hosted Link
            </Button>
            {inv?.status === 'draft' && (
              <Button
                variant="secondary"
                icon={Send}
                onClick={() => markSent.mutate()}
                disabled={markSent.isPending}
              >
                Mark Sent
              </Button>
            )}
            {(inv?.status === 'draft' || inv?.status === 'sent') && (
              <Button
                variant="secondary"
                icon={X}
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="secondary"
              icon={Mail}
              onClick={() => sendEmail.mutate()}
              disabled={sendEmail.isPending}
            >
              Send Email
            </Button>
          </div>
        </div>

        {invQ.isLoading ? (
          <div className="bg-surface rounded-card p-8 text-center text-text-secondary">
            Loading…
          </div>
        ) : !inv ? (
          <div className="bg-[#FFEBEE] border border-error rounded-card p-4 text-error">
            Invoice not found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Details Card */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
              <div className="px-6 py-4 border-b bg-background font-semibold">Details</div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Status</span>
                  <StatusPill status={statusMap[inv.status] || 'pending'} />
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Customer</span>
                  <span className="font-semibold">{inv.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Email</span>
                  <span className="font-semibold">{inv.customer_email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Phone</span>
                  <span className="font-semibold">{inv.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Due Date</span>
                  <span className="font-semibold">
                    {inv.due_date
                      ? new Date(inv.due_date).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
                <div className="h-px bg-[#E0E0E0] my-2" />
                <div className="flex justify-between">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="font-semibold">
                    {formatCurrency(inv.subtotal || 0, inv.currency || 'KES')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Tax</span>
                  <span className="font-semibold">
                    {formatCurrency(inv.tax || 0, inv.currency || 'KES')}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E0E0E0]">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(inv.total || 0, inv.currency || 'KES')}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
              <div className="px-6 py-4 border-b bg-background font-semibold">Items</div>
              <div className="p-6 space-y-3">
                {items.length === 0 ? (
                  <div className="text-text-secondary text-center py-4">No items</div>
                ) : (
                  items.map((it: any) => (
                    <div
                      key={it.id}
                      className="flex justify-between items-center p-3 bg-background rounded-xl"
                    >
                      <div>
                        <div className="font-semibold">{it.name}</div>
                        <div className="text-sm text-text-secondary">
                          Qty: {it.qty} × {formatCurrency(it.unit_price || 0, inv.currency || 'KES')}
                        </div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(it.line_total || 0, inv.currency || 'KES')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payments Card */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden md:col-span-2">
              <div className="px-6 py-4 border-b bg-background font-semibold">Payments</div>
              <div className="p-6">
                {payQ.isLoading ? (
                  <div className="text-text-secondary text-center py-4">Loading payments…</div>
                ) : payments.length === 0 ? (
                  <div className="text-text-secondary text-center py-4">No payments yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-5 gap-4 px-4 py-3 text-xs font-semibold text-text-secondary border-b bg-background">
                      <div>ID</div>
                      <div>Status</div>
                      <div>Amount</div>
                      <div>Reference</div>
                      <div>Created</div>
                    </div>
                    {payments.map((p: any) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-5 gap-4 px-4 py-3 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center"
                      >
                        <div className="font-mono text-sm">#{p.id}</div>
                        <div>
                          <StatusPill status={statusMap[p.status] || 'pending'} />
                        </div>
                        <div className="font-semibold">
                          {formatCurrency(p.amount || 0, inv.currency || 'KES')}
                        </div>
                        <div className="text-sm text-text-secondary font-mono">
                          {p.provider_ref || '-'}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {new Date(p.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerchantInvoiceDetail(props: any) {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantInvoiceDetailContent {...props} />
    </ProtectedRoute>
  );
}

