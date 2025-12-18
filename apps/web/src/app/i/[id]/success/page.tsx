import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { CheckCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function InvoiceSuccessPage(props: { params?: { id?: string } }) {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id || props?.params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-status', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 8000,
  });

  const status = data?.status;

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    paid: 'success',
    pending: 'pending',
    cancelled: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="bg-surface rounded-card p-12 border border-[#E0E0E0] text-center">
          <div className="mb-6">
            {isLoading ? (
              <Loader2 size={64} className="text-primary mx-auto mb-4 animate-spin" />
            ) : status === 'paid' ? (
              <CheckCircle size={64} className="text-success mx-auto mb-4" />
            ) : (
              <div className="w-16 h-16 bg-primary-light rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold mb-4">Thank you!</h1>

          {isLoading ? (
            <p className="text-text-secondary mb-6">Checking payment status…</p>
          ) : status === 'paid' ? (
            <div className="mb-6">
              <p className="text-success font-semibold text-lg mb-2">Invoice is paid.</p>
              <StatusPill status="success" />
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-text-secondary mb-2">Invoice status:</p>
              <StatusPill status={statusMap[status || 'pending'] || 'pending'} />
            </div>
          )}

          <Button icon={ArrowLeft} onClick={() => navigate(`/i/${id}`)}>
            Back to Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

