import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { Plus, Smartphone, CreditCard, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { useNavigate } from 'react-router';

export default function WalletTopUpPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa_stk');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Top-up failed: [${res.status}] ${res.statusText} ${text}`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess({ ref: data?.order_reference, sessionId: data?.session_id });
      setError(null);
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      toast.success('Top-up request started. Check your phone to approve.');
    },
    onError: (e) => {
      console.error(e);
      setError(e?.message || 'Could not start top-up');
      toast.error(e?.message || 'Could not start top-up');
    },
  });

  const canSubmit = useMemo(() => {
    if (!(Number(amount) > 0)) return false;
    if (method === 'mpesa_stk' && !phone) return false;
    return true;
  }, [amount, method, phone]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    mutation.mutate({ amount: Number(amount), method, phone });
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
            <h1 className="text-3xl font-bold mb-2">Add Funds</h1>
            <p className="text-text-secondary">
              Top up your Bridge Wallet using M-Pesa or card/bank
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  You are adding {formatCurrency(Number(amount), 'KES')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('mpesa_stk')}
                  className={`px-4 py-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    method === 'mpesa_stk'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <Smartphone size={24} className={method === 'mpesa_stk' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="font-semibold">M-Pesa STK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`px-4 py-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    method === 'card'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <CreditCard size={24} className={method === 'card' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="font-semibold">Card/Bank</span>
                </button>
              </div>
            </div>

            {method === 'mpesa_stk' && (
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  M-Pesa Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  placeholder="07XXXXXXXX"
                />
              </div>
            )}

            {error && (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-[#E8F5E9] border border-success rounded-xl p-4 text-success text-sm">
                Request started. Check your phone to approve. Ref: {success.ref}
              </div>
            )}

            <Button
              type="submit"
              icon={Plus}
              disabled={!canSubmit || mutation.isPending}
              fullWidth
            >
              {mutation.isPending ? 'Starting...' : 'Add Funds'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
