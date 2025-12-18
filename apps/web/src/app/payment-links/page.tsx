import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { Plus, Copy, ExternalLink, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function PaymentLinksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState<string | null>(null);

  const linksQuery = useQuery({
    queryKey: ['payment-links', cursor],
    queryFn: async () => {
      const url = new URL('/api/payment-links', window.location.origin);
      if (cursor) url.searchParams.set('cursor', cursor);
      url.searchParams.set('limit', '20');

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch payment links: ${res.statusText}`);
      }
      const data = await res.json();
      // API returns { ok: true, items, pagination } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch payment links');
      }
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete payment link');
      }
      const data = await res.json();
      // API returns { ok: true, ... } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to delete payment link');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      toast.success('Payment link cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel payment link');
    },
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const links = linksQuery.data?.items || [];
  const pagination = linksQuery.data?.pagination;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} className="text-success" />;
      case 'cancelled':
      case 'expired':
        return <XCircle size={16} className="text-error" />;
      default:
        return <Clock size={16} className="text-primary" />;
    }
  };

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    paid: 'success',
    active: 'pending',
    cancelled: 'failed',
    expired: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payment Links</h1>
            <p className="text-text-secondary">
              Create and share payment links with customers
            </p>
          </div>
          <Button icon={Plus} onClick={() => navigate('/payment-links/create')}>
            Create Link
          </Button>
        </div>

        {linksQuery.isLoading ? (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-background rounded w-3/4" />
              <div className="h-4 bg-background rounded w-1/2" />
              <div className="h-4 bg-background rounded w-2/3" />
            </div>
          </div>
        ) : linksQuery.error ? (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="text-error">
              Failed to load payment links: {(linksQuery.error as Error).message}
            </div>
          </div>
        ) : links.length === 0 ? (
          <div className="bg-surface rounded-card p-12 border border-[#E0E0E0] text-center">
            <p className="text-text-secondary mb-4">No payment links yet</p>
            <Button icon={Plus} onClick={() => navigate('/payment-links/create')}>
              Create Your First Link
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {links.map((link: any) => {
                const linkUrl = `${window.location.origin}/pay/link/${link.code}`;
                return (
                  <div
                    key={link.id}
                    className="bg-surface rounded-card p-6 border border-[#E0E0E0]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold">
                            {formatCurrency(link.amount, link.currency)}
                          </h3>
                          <StatusPill
                            status={statusMap[link.status] || 'pending'}
                          />
                        </div>
                        {link.description && (
                          <p className="text-sm text-text-secondary mb-3">
                            {link.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-text-secondary mb-3 flex-wrap">
                          <span>Code: {link.code}</span>
                          {link.expires_at && (
                            <span>
                              Expires:{' '}
                              {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Created:{' '}
                            {new Date(link.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {link.status === 'active' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={linkUrl}
                              className="flex-1 px-4 py-2 text-sm border-2 border-[#E0E0E0] rounded-xl bg-background font-mono"
                            />
                            <button
                              onClick={() => copyLink(linkUrl)}
                              className="p-2 border-2 border-[#E0E0E0] rounded-xl hover:bg-background transition-colors"
                            >
                              <Copy size={16} />
                            </button>
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 border-2 border-[#E0E0E0] rounded-xl hover:bg-background transition-colors"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        )}
                      </div>
                      {link.status === 'active' && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to cancel this payment link?'
                              )
                            ) {
                              deleteMutation.mutate(link.id);
                            }
                          }}
                          className="p-2 text-error hover:bg-[#FFEBEE] rounded-xl transition-colors"
                          title="Cancel link"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination?.hasMore && (
              <div className="text-center">
                <Button
                  variant="secondary"
                  onClick={() => setCursor(pagination.cursor)}
                  disabled={linksQuery.isFetching}
                >
                  {linksQuery.isFetching ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

