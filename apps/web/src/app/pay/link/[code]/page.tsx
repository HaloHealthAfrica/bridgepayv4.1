import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/common/Button';
import { DollarSign, Calendar, FileText, Phone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function PaymentLinkPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  const linkQuery = useQuery({
    queryKey: ['payment-link-public', code],
    queryFn: async () => {
      const res = await fetch(`/api/payment-links/${code}/public`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Payment link not found');
      }
      return res.json();
    },
    retry: false,
  });

  const payMutation = useMutation({
    mutationFn: async (data: { method: string; phone_number: string }) => {
      const res = await fetch(`/api/payment-links/${code}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Payment failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Payment initiated!');
      navigate(`/pay/success/${data.payment_id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Payment failed');
    },
  });

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    payMutation.mutate({ method: 'stk', phone_number: phone });
  };

  if (linkQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <div className="text-text-secondary">Loading payment link...</div>
        </div>
      </div>
    );
  }

  if (linkQuery.isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border-2 border-error rounded-card p-8 text-center">
          <XCircle size={64} className="text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-error mb-2">Payment Link Error</h2>
          <p className="text-text-secondary mb-6">
            {(linkQuery.error as Error)?.message || 'Payment link not found'}
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const link = linkQuery.data;
  const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
  const isPaid = link.status === 'paid';
  const isCancelled = link.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-card shadow-lg p-8 border border-[#E0E0E0]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-light rounded-full mb-4">
            <DollarSign size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Payment Request</h1>
          {link.description && (
            <p className="text-text-secondary">{link.description}</p>
          )}
        </div>

        {/* Status Messages */}
        {isPaid && (
          <div className="bg-[#E8F5E9] border-2 border-success rounded-xl p-4 mb-6 text-center">
            <CheckCircle size={24} className="text-success mx-auto mb-2" />
            <div className="font-semibold text-success">This payment link has been paid</div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-[#FFEBEE] border-2 border-error rounded-xl p-4 mb-6 text-center">
            <XCircle size={24} className="text-error mx-auto mb-2" />
            <div className="font-semibold text-error">This payment link has been cancelled</div>
          </div>
        )}

        {isExpired && (
          <div className="bg-[#FFF3E0] border-2 border-warning rounded-xl p-4 mb-6 text-center">
            <div className="font-semibold text-warning">This payment link has expired</div>
          </div>
        )}

        {/* Amount Display */}
        <div className="bg-primary-light rounded-xl p-6 mb-6 text-center">
          <div className="text-sm text-text-secondary mb-2">Amount</div>
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(link.amount || 0, link.currency || 'KES')}
          </div>
        </div>

        {/* Expiration */}
        {link.expires_at && (
          <div className="flex items-center gap-2 text-sm text-text-secondary mb-6 justify-center">
            <Calendar size={16} />
            <span>Expires: {new Date(link.expires_at).toLocaleString()}</span>
          </div>
        )}

        {/* Payment Form */}
        {!isPaid && !isCancelled && !isExpired && (
          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  placeholder="0712 345 678"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={payMutation.isPending}
            >
              {payMutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          </form>
        )}

        {/* Security Footer */}
        <div className="mt-6 pt-6 border-t border-[#E0E0E0]">
          <div className="flex items-center gap-2 text-xs text-text-secondary justify-center">
            <FileText size={14} />
            <span>Secure payment powered by Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
}

