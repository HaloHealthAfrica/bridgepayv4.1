import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { Phone, Wallet, Lock, ArrowRight, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useWallet } from '@/hooks/useWallet';

function genOrderRef() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `ref-${Date.now()}-${rnd}`;
}

function validate({ method, amount, phone, wallet, reference }: any) {
  const errors: any = {};
  const amt = Number(amount);
  if (!amt || Number.isNaN(amt) || amt <= 0.01) {
    errors.amount = 'Enter an amount greater than 0.01';
  }
  if (!reference || !/^[A-Za-z0-9-_]+$/.test(reference)) {
    errors.reference = 'Use letters, numbers, dash or underscore';
  }
  if (method === 'stk') {
    if (!phone || !/^((\+?254)?0?7\d{8})$/.test(phone.replace(/\s+/g, ''))) {
      errors.phone = 'Enter a valid phone like 0712… or +254712…';
    }
  } else if (method === 'wallet') {
    if (!wallet || String(wallet).length < 6 || String(wallet).length > 20) {
      errors.wallet = 'Wallet number must be 6–20 characters';
    }
  }
  return errors;
}

export default function PayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const { walletData } = useWallet();
  const [method, setMethod] = useState<'stk' | 'wallet' | 'card'>('stk');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState(genOrderRef());
  const [description, setDescription] = useState('Payment');
  const [phone, setPhone] = useState('');
  const [wallet, setWallet] = useState('');
  const [currency, setCurrency] = useState(walletData?.currency || 'KES');
  const [errors, setErrors] = useState<any>({});

  // Prefill from query params
  useEffect(() => {
    const qAmount = searchParams.get('amount');
    const qRef = searchParams.get('reference');
    const qPhone = searchParams.get('phone');
    const qWallet = searchParams.get('wallet_no');
    const qDesc = searchParams.get('description');
    const qMethod = searchParams.get('method');
    if (qAmount) setAmount(qAmount);
    if (qRef) setReference(qRef);
    if (qPhone) setPhone(qPhone);
    if (qWallet) setWallet(qWallet);
    if (qDesc) setDescription(qDesc);
    if (qMethod && (qMethod === 'stk' || qMethod === 'wallet' || qMethod === 'card'))
      setMethod(qMethod);
  }, [searchParams]);

  const endpoint = useMemo(() => {
    const role = session?.user?.role;
    if (role === 'customer') return '/api/payments/lemonade/create-self';
    return '/api/payments/lemonade/create';
  }, [session?.user?.role]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        amount: Number(amount),
        order_reference: reference,
      };
      if (description && description !== '') payload.description = description;
      if (method === 'stk') payload.phone_number = phone;
      if (method === 'wallet') payload.wallet_no = wallet;

      const body = {
        action: method === 'stk' ? 'stk_push' : 'wallet_payment',
        payload,
      };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {}
        throw new Error(json?.message || json?.error || 'Payment failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      const paymentId = data?.payment?.id || data?.id;
      if (paymentId) {
        toast.success('Payment initiated!');
        navigate(`/pay/success/${paymentId}`);
      } else {
        toast.success('Payment initiated!');
        navigate('/dashboard');
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Payment failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate({ method, amount, phone, wallet, reference });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Make a Payment</h1>
          <p className="text-text-secondary">Send money securely via M-Pesa, Wallet, or Card</p>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-semibold text-text mb-3">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod('stk')}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                    method === 'stk'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <Phone size={24} className={method === 'stk' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="text-sm font-semibold">M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('wallet')}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                    method === 'wallet'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <Wallet size={24} className={method === 'wallet' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="text-sm font-semibold">Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-colors ${
                    method === 'card'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0] hover:border-primary'
                  }`}
                >
                  <CreditCard size={24} className={method === 'card' ? 'text-primary' : 'text-text-secondary'} />
                  <span className="text-sm font-semibold">Card</span>
                </button>
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Currency
              </label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Amount ({currency})
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder="0.00"
                required
              />
              {errors.amount && (
                <p className="text-sm text-error mt-1">{errors.amount}</p>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className="px-4 py-2 border-2 border-primary rounded-lg text-primary font-semibold hover:bg-primary-light transition-colors text-sm"
                  >
                    {formatCurrency(amt, currency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Method-specific fields */}
            {method === 'stk' && (
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Phone Number
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
                {errors.phone && (
                  <p className="text-sm text-error mt-1">{errors.phone}</p>
                )}
              </div>
            )}

            {method === 'wallet' && (
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Wallet Number
                </label>
                <div className="relative">
                  <Wallet
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                  <input
                    type="text"
                    value={wallet}
                    onChange={(e) => setWallet(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="Enter wallet number"
                    required
                  />
                </div>
                {errors.wallet && (
                  <p className="text-sm text-error mt-1">{errors.wallet}</p>
                )}
              </div>
            )}

            {method === 'card' && (
              <div className="bg-primary-light rounded-xl p-4 text-sm text-text-secondary">
                Card payments coming soon. Please use M-Pesa or Wallet for now.
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder="Payment description"
              />
            </div>

            {/* Reference */}
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-4 py-4 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-mono text-sm"
                required
              />
              {errors.reference && (
                <p className="text-sm text-error mt-1">{errors.reference}</p>
              )}
            </div>

            {/* Security Note */}
            <div className="bg-primary-light rounded-xl p-4 flex gap-3">
              <Lock size={20} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <div className="font-semibold text-text mb-1">Secure Payment</div>
                <div>Your payment is processed securely. We never store your payment details.</div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              disabled={mutation.isPending || method === 'card'}
              icon={mutation.isPending ? undefined : ArrowRight}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {amount ? formatCurrency(Number(amount), currency) : ''}
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

