import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { Copy, Download, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function ReceiptPage(props: { params?: { id?: string } }) {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id || props?.params?.id;
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      const res = await fetch(`/api/payments/receipt/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch receipt: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading receipt…</div>
        </div>
      </div>
    );
  }

  if (error || !data?.ok) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh] p-4">
          <div className="max-w-md w-full bg-[#FFEBEE] border border-error rounded-card p-6 text-error">
            {error ? 'Could not load the receipt. Please try again later.' : 'This receipt is not available.'}
          </div>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    completed: 'success',
    pending: 'pending',
    failed: 'failed',
  };

  const amountDisplay = formatCurrency(data.amount || 0, data.currency || 'KES');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment Receipt</h1>
            <p className="text-text-secondary">#{data.receiptId || id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/wallet')}>
              Back to Wallet
            </Button>
            <Button variant="secondary" icon={Copy} onClick={onCopy}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>

        <div className="bg-surface rounded-card p-8 border border-[#E0E0E0]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">Payment Receipt</h2>
              <p className="text-sm text-text-secondary">Reference: {data.reference || '—'}</p>
            </div>
            <StatusPill status={statusMap[data.status || 'pending']} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-sm text-text-secondary mb-2">Amount</div>
              <div className="text-4xl font-bold">{amountDisplay}</div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-2">Dates</div>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Created: </span>
                  {data.createdAt ? new Date(data.createdAt).toLocaleString() : '—'}
                </div>
                <div>
                  <span className="font-semibold">Completed: </span>
                  {data.completedAt ? new Date(data.completedAt).toLocaleString() : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="text-sm text-text-secondary mb-2">References</div>
              <div className="space-y-2">
                <div>
                  <span className="text-text-secondary">Reference: </span>
                  <span className="font-mono text-sm">{data.reference || '—'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Provider Ref: </span>
                  <span className="font-mono text-sm">{data.provider_ref || '—'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Transaction ID: </span>
                  <span className="font-mono text-sm">{data.transaction_id || '—'}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-2">Payer</div>
              <div className="space-y-2">
                <div>
                  <span className="text-text-secondary">Name: </span>
                  <span>{data.payer?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Phone: </span>
                  <span>{data.payer?.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Email: </span>
                  <span>{data.payer?.email || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-sm text-text-secondary mb-3">Line Items</div>
            <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-background">
                <div className="font-semibold">{data.lineItems?.[0]?.title || 'Payment'}</div>
                <div className="font-bold">{amountDisplay}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <Button icon={Copy} onClick={onCopy} fullWidth>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="secondary" icon={Download} disabled fullWidth>
              Download PDF
            </Button>
            <Button variant="secondary" icon={Mail} disabled fullWidth>
              Email Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

