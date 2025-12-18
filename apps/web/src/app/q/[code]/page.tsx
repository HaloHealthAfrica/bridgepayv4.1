import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { QrCode, Smartphone, Wallet, RefreshCw, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function HostedQRPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['qr', code],
    queryFn: async () => {
      const res = await fetch(`/api/qr/${code}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load QR ${code}`);
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [phone, setPhone] = useState('');
  const [wallet, setWallet] = useState('11391837');
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const payMutation = useMutation({
    mutationFn: async ({ method }: { method: 'stk' | 'wallet' }) => {
      const payload: any = {
        code,
        method,
      };
      if (method === 'stk') payload.phone_number = phone;
      if (method === 'wallet') payload.wallet_no = wallet;
      const res = await fetch(`/api/qr/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const e = new Error(json?.error || `Pay failed: ${res.status}`);
        (e as any).response = json || text;
        throw e;
      }
      return json;
    },
    onSuccess: (json) => {
      setErrMsg(null);
      const pid = json?.payment_id;
      setLastPaymentId(pid || null);
      if (pid && typeof window !== 'undefined') {
        navigate(`/pay/success/${pid}`);
      }
    },
    onError: (e: any) => {
      console.error('qr.pay error', e);
      const details = e?.response?.details;
      const detailMsg = Array.isArray(details) ? details.join(', ') : undefined;
      setErrMsg(detailMsg || e.message || 'Payment failed');
      toast.error(detailMsg || e.message || 'Payment failed');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!lastPaymentId) return { ok: false, error: 'no_payment' };
      const res = await fetch(`/api/payments/lemonade/status-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: Number(lastPaymentId) }),
      });
      const json = await res.json().catch(() => ({}));
      return json;
    },
    onSuccess: () => {
      toast.success('Status checked');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to check status');
    },
  });

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    active: 'success',
    expired: 'failed',
    used: 'success',
    disabled: 'failed',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <div className="text-text-secondary">Loading QR…</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <div className="bg-[#FFEBEE] border border-error rounded-card p-8 text-center">
            <XCircle size={64} className="text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-error mb-2">QR not found</h1>
            <p className="text-text-secondary">This code may be invalid or removed.</p>
          </div>
        </div>
      </div>
    );
  }

  const canPay = data.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">QR Payment</h1>
            <p className="text-text-secondary">Scan and pay with this QR code</p>
          </div>
          <StatusPill status={statusMap[data.status] || 'pending'} />
        </div>

        {/* QR Code Display */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm text-text-secondary mb-1">Code</div>
              <div className="font-mono text-lg font-bold">{code}</div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-1">Amount</div>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(data.amount || 0, data.currency || 'KES')}
              </div>
            </div>
          </div>
          {data.metadata?.description && (
            <div className="mt-4 pt-4 border-t border-[#E0E0E0]">
              <div className="text-sm text-text-secondary mb-1">Description</div>
              <div className="text-text">{data.metadata.description}</div>
            </div>
          )}
        </div>

        {/* QR Image */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6 text-center">
          <div className="text-sm font-semibold text-text-secondary mb-4">QR Code</div>
          <div className="flex justify-center">
            <img
              src={`/api/qr/image/${code}?format=svg&size=320`}
              alt="QR Code"
              className="w-[320px] h-[320px] object-contain bg-white p-4 rounded-xl"
            />
          </div>
        </div>

        {/* Payment Form */}
        {canPay ? (
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Pay with</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Phone (for STK)
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary mb-3"
                />
                <Button
                  icon={Smartphone}
                  onClick={() => payMutation.mutate({ method: 'stk' })}
                  disabled={!phone || payMutation.isPending}
                  fullWidth
                >
                  {payMutation.isPending ? 'Processing…' : 'Pay with STK Push'}
                </Button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Wallet No
                </label>
                <input
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary mb-3"
                />
                <Button
                  icon={Wallet}
                  onClick={() => payMutation.mutate({ method: 'wallet' })}
                  disabled={!wallet || payMutation.isPending}
                  fullWidth
                  variant="secondary"
                >
                  {payMutation.isPending ? 'Processing…' : 'Pay with Wallet'}
                </Button>
              </div>
            </div>
            {errMsg && (
              <div className="mt-4 bg-[#FFEBEE] border border-error rounded-xl p-4 text-error text-sm">
                {errMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FFF3E0] border border-warning rounded-card p-6 mb-6 text-center">
            <div className="font-semibold text-warning">
              Payments are not available for this QR code.
            </div>
            <div className="text-sm text-text-secondary mt-2">
              Status: {data.status}
            </div>
          </div>
        )}

        {/* Last Payment Status */}
        {lastPaymentId && (
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-text-secondary mb-1">Last payment attempt</div>
                <div className="font-mono font-semibold">#{lastPaymentId}</div>
              </div>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? 'Checking...' : 'Check Status'}
              </Button>
            </div>
            {statusMutation.data && (
              <div className="mt-4 p-4 bg-background rounded-xl overflow-x-auto">
                <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                  {JSON.stringify(statusMutation.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

