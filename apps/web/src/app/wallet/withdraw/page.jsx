import React, { useState, useMemo, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ArrowDownRight, Smartphone, Landmark, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useWallet } from '@/hooks/useWallet';
import { useNavigate } from 'react-router';

export default function WalletWithdrawPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { walletData } = useWallet();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(walletData?.currency || 'KES');
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any>(null);

  // Update currency when wallet data loads
  useEffect(() => {
    if (walletData?.currency) {
      setCurrency(walletData.currency);
    }
  }, [walletData?.currency]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Withdraw failed: [${res.status}] ${res.statusText} ${text}`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccess({ ref: data?.order_reference, id: data?.withdrawal_id });
      setError(null);
      qc.invalidateQueries({ queryKey: ['wallet-summary'] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      toast.success('Withdrawal requested successfully');
    },
    onError: (e: any) => {
      console.error(e);
      setError(e?.message || 'Could not start withdrawal');
      toast.error(e?.message || 'Could not start withdrawal');
    },
  });

  const canSubmit = useMemo(() => {
    if (!(Number(amount) > 0)) return false;
    if (method === 'mpesa' && !phone) return false;
    return true;
  }, [amount, method, phone]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    mutation.mutate({ amount: Number(amount), currency, method, phone });
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
            <h1 className="text-3xl font-bold mb-2">Withdraw Funds</h1>
            <p className="text-text-secondary">
              Send money from your Bridge Wallet to M-Pesa or bank
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Currency</label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Amount ({currency})</label>
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
                  You are withdrawing {formatCurrency(Number(amount), currency)}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('mpesa')}
                  className={`px-4 py-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    method === 'mpesa'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <Smartphone size={24} className={method === 'mpesa' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="font-semibold">M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('bank')}
                  className={`px-4 py-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                    method === 'bank'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <Landmark size={24} className={method === 'bank' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="font-semibold">Bank</span>
                </button>
              </div>
            </div>

            {method === 'mpesa' && (
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
                Withdrawal requested. Ref: {success.ref}
              </div>
            )}

            <Button
              type="submit"
              icon={ArrowDownRight}
              disabled={!canSubmit || mutation.isPending}
              fullWidth
            >
              {mutation.isPending ? 'Starting...' : 'Withdraw'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
