import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { CheckCircle2, XCircle, FileText, RefreshCcw, Copy, Link as LinkIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function PaySuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confetti, setConfetti] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const paymentQuery = useQuery({
    queryKey: ['payment', id],
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/payments/lemonade/${id}`);
      if (!res.ok) {
        const text = await res.text();
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {}
        throw new Error(json?.error || 'Failed to fetch payment');
      }
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/lemonade/status-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: Number(id) }),
      });
      if (!res.ok) throw new Error('Status sync failed');
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['payment', id] });
      toast.success('Status updated');
    },
  });

  const payment = paymentQuery.data?.payment;
  const status = payment?.status;
  const amount = payment?.amount;
  const currency = payment?.currency || 'KES';
  const orderRef = payment?.order_reference;
  const providerRef = payment?.provider_ref;
  const updatedAt = payment?.updated_at;
  const meta = payment?.metadata || {};
  const sent = meta?.sent_payload || {};
  const isSTK = payment?.type === 'paybill';

  // Confetti effect
  useEffect(() => {
    if (status === 'completed') {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 1000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // Polling while pending
  useEffect(() => {
    if (status === 'pending' && !statusMutation.isPending) {
      pollingRef.current = setInterval(() => {
        statusMutation.mutate();
      }, 5000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [status, statusMutation]);

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast('Copied');
    }
  };

  const copyLink = (suffix: string) => {
    const href = typeof window !== 'undefined' ? `${window.location.origin}${suffix}` : suffix;
    onCopy(href);
  };

  if (paymentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  if (paymentQuery.isError) {
    const status = (paymentQuery.error as any)?.status;
    if (status === 404) {
      return (
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="flex items-center justify-center min-h-[60vh] p-6">
            <div className="max-w-md w-full bg-surface rounded-card p-6 border border-[#E0E0E0]">
              <h1 className="text-lg font-bold mb-2">Payment Not Found</h1>
              <p className="text-text-secondary mb-4">We couldn't find that payment.</p>
              <Button onClick={() => navigate('/pay')} icon={ArrowLeft}>
                Back to Pay
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-error">Something went wrong. Please try again.</div>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    completed: 'success',
    pending: 'pending',
    failed: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        {/* Success Header */}
        {status === 'completed' && (
          <div className="bg-[#E8F5E9] border-2 border-success rounded-card p-6 mb-6 text-center">
            <CheckCircle2 size={64} className="text-success mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-success mb-2">Payment Successful!</h1>
            <p className="text-text-secondary">Your payment has been confirmed</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-[#FFEBEE] border-2 border-error rounded-card p-6 mb-6 text-center">
            <XCircle size={64} className="text-error mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-error mb-2">Payment Failed</h1>
            <p className="text-text-secondary">Please try again</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="bg-[#FFF3E0] border-2 border-warning rounded-card p-6 mb-6 text-center">
            <Loader2 size={64} className="text-warning mx-auto mb-4 animate-spin" />
            <h1 className="text-3xl font-bold text-warning mb-2">Payment Pending</h1>
            <p className="text-text-secondary">Waiting for confirmation...</p>
          </div>
        )}

        {/* Payment Details Card */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(amount || 0, currency)}
              </div>
              <div className="text-sm text-text-secondary">
                Last updated: {updatedAt ? new Date(updatedAt).toLocaleString() : '-'}
              </div>
            </div>
            <div className="flex gap-2">
              <StatusPill status={statusMap[status || 'pending']} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-text-secondary mb-2">Reference</div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 rounded-xl bg-background border border-[#E0E0E0] flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm">
                  {orderRef}
                </code>
                <button
                  onClick={() => onCopy(orderRef || '')}
                  className="p-2 border border-[#E0E0E0] rounded-xl hover:bg-background transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-2">Provider Ref</div>
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 rounded-xl bg-background border border-[#E0E0E0] flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm">
                  {providerRef || '-'}
                </code>
                {providerRef && (
                  <button
                    onClick={() => onCopy(providerRef)}
                    className="p-2 border border-[#E0E0E0] rounded-xl hover:bg-background transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-sm text-text-secondary mb-2">Payment Link</div>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 rounded-xl bg-background border border-[#E0E0E0] flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm">
                {typeof window !== 'undefined' ? window.location.href : ''}
              </code>
              <button
                onClick={() => copyLink(`/pay/success/${payment?.id}`)}
                className="p-2 border border-[#E0E0E0] rounded-xl hover:bg-background transition-colors"
              >
                <LinkIcon size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              icon={FileText}
              onClick={() => navigate(`/payments/receipt/${payment?.id}`)}
            >
              View Receipt
            </Button>
            <Button
              variant="secondary"
              icon={statusMutation.isPending ? undefined : RefreshCcw}
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Status'
              )}
            </Button>
          </div>

          {/* Change number for pending STK */}
          {status === 'pending' && isSTK && (
            <div className="mt-4">
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() =>
                  navigate(
                    `/pay?method=stk&amount=${encodeURIComponent(payment?.amount || 0)}&reference=${encodeURIComponent(orderRef || '')}&phone=${encodeURIComponent(sent?.phone_number || '')}`
                  )
                }
              >
                Change Number
              </Button>
            </div>
          )}
        </div>

        {/* Confetti Animation */}
        {confetti && (
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][
                    Math.floor(Math.random() * 5)
                  ],
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(80vh) rotate(360deg); opacity: 0; }
        }
        .confetti {
          position: absolute;
          width: 8px;
          height: 14px;
          opacity: 0;
          animation: fall 1s ease-in forwards;
        }
      `}</style>
    </div>
  );
}

