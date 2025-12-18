import React, { useState } from 'react';
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { Phone, Wallet, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

function shortId(id: any) {
  const s = String(id || '');
  return s.length > 6 ? s.slice(-6) : s;
}

export default function HostedInvoicePage(props: { params?: { id?: string } }) {
  const params = useParams();
  const id = params.id || props?.params?.id;
  const { data: session } = useSession();
  const [phone, setPhone] = useState('');
  const [wallet, setWallet] = useState('');
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Failed to load invoice');
      return res.json();
    },
    enabled: !!id,
  });

  const inv = data?.invoice;
  const items = data?.items || [];
  const isPaid = inv?.status === 'paid';
  const isCancelled = inv?.status === 'cancelled';

  const stkMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (session?.user && session.user.role === 'customer') {
        const res = await fetch('/api/payments/lemonade/create-self', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'stk_push',
            payload: {
              amount: inv.total,
              phone_number: phone,
              currency: inv.currency || 'KES',
              order_reference: `inv-${inv.id}`,
              description: `Invoice ${inv.id}`,
            },
            metadata: { invoice_id: inv.id },
          }),
        });
        const out = await res.json();
        if (!res.ok || !out?.payment_id) {
          throw new Error(out?.error || 'Could not start payment');
        }
        return out;
      }
      const res = await fetch(`/api/invoices/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'stk', phone_number: phone }),
      });
      const out = await res.json();
      if (!res.ok || !out?.payment_id)
        throw new Error(out?.error || 'Checkout failed');
      return out;
    },
    onSuccess: (out) => {
      if (typeof window !== 'undefined')
        window.location.href = `/pay/success/${out.payment_id}`;
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Payment failed');
    },
  });

  const walletMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (session?.user && session.user.role === 'customer') {
        const res = await fetch('/api/payments/lemonade/create-self', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'wallet_payment',
            payload: {
              amount: inv.total,
              wallet_no: wallet,
              currency: inv.currency || 'KES',
              order_reference: `inv-${inv.id}`,
              description: `Invoice ${inv.id}`,
            },
            metadata: { invoice_id: inv.id },
          }),
        });
        const out = await res.json();
        if (!res.ok || !out?.payment_id)
          throw new Error(out?.error || 'Could not start payment');
        return out;
      }
      const res = await fetch(`/api/invoices/${id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'wallet', wallet_no: wallet }),
      });
      const out = await res.json();
      if (!res.ok || !out?.payment_id)
        throw new Error(out?.error || 'Checkout failed');
      return out;
    },
    onSuccess: (out) => {
      if (typeof window !== 'undefined')
        window.location.href = `/pay/success/${out.payment_id}`;
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Payment failed');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  if (fetchError || !inv) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-error">Invoice not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Invoice #{shortId(inv.id)}</h1>
          {inv.customer_name && (
            <p className="text-text-secondary">{inv.customer_name}</p>
          )}
        </div>

        {/* Status Banner */}
        {isPaid && (
          <div className="bg-[#E8F5E9] border-2 border-success rounded-card p-4 mb-6 flex items-center gap-3">
            <CheckCircle size={24} className="text-success" />
            <div>
              <div className="font-semibold text-success">Paid</div>
              <a href="/merchant/invoices" className="text-sm text-success underline">
                View invoices
              </a>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-[#FFEBEE] border-2 border-error rounded-card p-4 mb-6 flex items-center gap-3">
            <XCircle size={24} className="text-error" />
            <div className="font-semibold text-error">Cancelled</div>
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-4">Items</h2>
            <div className="space-y-3">
              {items.map((it: any) => (
                <div key={it.id} className="flex justify-between items-center p-3 bg-background rounded-xl">
                  <div>
                    <div className="font-semibold">{it.name}</div>
                    <div className="text-sm text-text-secondary">x{it.qty}</div>
                  </div>
                  <div className="font-bold">
                    {formatCurrency(Number(it.line_total || 0), inv.currency)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#E0E0E0] my-4" />

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span className="font-semibold">
                {formatCurrency(Number(inv.subtotal || 0), inv.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Tax</span>
              <span className="font-semibold">
                {formatCurrency(Number(inv.tax || 0), inv.currency)}
              </span>
            </div>
            <div className="h-px bg-[#E0E0E0] my-2" />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(Number(inv.total || 0), inv.currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        {!isPaid && !isCancelled && (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h2 className="text-lg font-bold mb-4">Pay Now</h2>
            {error && (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-3 mb-4 text-error text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-[#E0E0E0] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Phone size={20} className="text-primary" />
                  <div className="font-semibold">STK Push</div>
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl mb-3 focus:outline-none focus:border-primary"
                />
                <Button
                  fullWidth
                  onClick={() => stkMutation.mutate()}
                  disabled={stkMutation.isPending}
                >
                  {stkMutation.isPending ? 'Starting…' : 'Pay with STK'}
                </Button>
              </div>
              <div className="border-2 border-[#E0E0E0] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet size={20} className="text-primary" />
                  <div className="font-semibold">Wallet</div>
                </div>
                <input
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="Wallet number"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl mb-3 focus:outline-none focus:border-primary"
                />
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => walletMutation.mutate()}
                  disabled={walletMutation.isPending}
                >
                  {walletMutation.isPending ? 'Starting…' : 'Pay with Wallet'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

