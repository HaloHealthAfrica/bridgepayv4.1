import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { Send, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { useNavigate } from 'react-router';

export default function WalletTransferPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Transfer failed: [${res.status}] ${res.statusText} ${text}`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess({ ref: data?.ref });
      setError(null);
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['wallet-activity'] });
      toast.success('Transfer completed successfully');
      // Reset form
      setAmount('');
      setEmail('');
    },
    onError: (e: any) => {
      console.error(e);
      setError(e?.message || 'Could not send money');
      toast.error(e?.message || 'Could not send money');
    },
  });

  const canSubmit = useMemo(() => {
    if (!(Number(amount) > 0)) return false;
    if (!email) return false;
    return true;
  }, [amount, email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    mutation.mutate({ amount: Number(amount), recipient_email: email });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/wallet')}>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Send to a Bridge user</h1>
            <p className="text-text-secondary">
              Instant, free wallet-to-wallet transfer
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Recipient email
              </label>
              <div className="flex items-center gap-2">
                <Mail size={20} className="text-text-secondary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  placeholder="person@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">Amount</label>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-lg"
                placeholder="1000"
              />
              {Number(amount) > 0 && (
                <div className="text-sm text-text-secondary mt-2">
                  You are sending {formatCurrency(Number(amount), 'KES')}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-[#E8F5E9] border border-success rounded-xl p-4 text-success text-sm">
                Sent. Ref: {success.ref}
              </div>
            )}

            <Button
              type="submit"
              icon={Send}
              disabled={!canSubmit || mutation.isPending}
              fullWidth
            >
              {mutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
