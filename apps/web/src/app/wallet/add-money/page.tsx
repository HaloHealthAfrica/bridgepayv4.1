import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowDownLeft, Phone, CreditCard, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { CurrencySelector } from '@/components/CurrencySelector';
import { walletAPI } from '@/services/api';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';

export default function AddMoneyPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'mpesa_stk' | 'card'>('mpesa_stk');
  const [currency, setCurrency] = useState('KES');
  const { walletData, refetch } = useWallet();
  const amount = watch('amount');
  
  // Use wallet currency if available, otherwise use selected currency
  const activeCurrency = walletData?.currency || currency;

  const quickAmounts = [500, 1000, 2000, 5000];

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const response = await walletAPI.topup({
        amount: Number(data.amount),
        method: selectedMethod,
        phone: data.phone || undefined,
        currency: activeCurrency,
      });

      if (response.data.ok) {
        toast.success('STK Push sent to your phone!');
        refetch();
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else {
        toast.error(response.data.error || 'Failed to initiate topup');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add money');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/wallet')}
            className="text-primary text-base font-semibold mb-4 hover:underline"
          >
            ← Back to Wallet
          </button>
          <h1 className="text-3xl font-bold mb-2">Add Money</h1>
          <p className="text-text-secondary">Fund your Bridge wallet</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
            <div className="mb-4">
              <label className="block mb-2 font-semibold">Currency</label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
            <label className="block mb-2 font-semibold">Amount ({activeCurrency})</label>
            <input
              type="number"
              placeholder="Enter amount"
              {...register('amount', { required: true, min: 1 })}
              className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl mb-6 focus:outline-none focus:border-primary"
            />

            <div className="mb-6">
              <div className="font-semibold mb-3">Quick Amounts</div>
              <div className="flex gap-2 flex-wrap">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setValue('amount', amt)}
                    className="px-6 py-3 border-2 border-primary rounded-lg bg-white text-primary font-semibold hover:bg-primary-light transition-colors"
                  >
                    {activeCurrency} {amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="font-semibold mb-3">Payment Method</div>
              <div className="flex flex-col gap-3">
                <div
                  onClick={() => setSelectedMethod('mpesa_stk')}
                  className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedMethod === 'mpesa_stk'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0]'
                  }`}
                >
                  <Phone size={24} className={selectedMethod === 'mpesa_stk' ? 'text-primary' : 'text-text-secondary'} />
                  <div className="flex-1">
                    <div className="font-semibold">M-Pesa</div>
                    <div className="text-sm text-text-secondary">STK Push to your phone</div>
                  </div>
                  {selectedMethod === 'mpesa_stk' && (
                    <CheckCircle size={20} className="text-primary" />
                  )}
                </div>
                <div
                  onClick={() => setSelectedMethod('card')}
                  className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                    selectedMethod === 'card'
                      ? 'border-primary bg-primary-light'
                      : 'border-[#E0E0E0]'
                  }`}
                >
                  <CreditCard size={24} className={selectedMethod === 'card' ? 'text-primary' : 'text-text-secondary'} />
                  <div className="flex-1">
                    <div className="font-semibold">Card</div>
                    <div className="text-sm text-text-secondary">Visa, Mastercard</div>
                  </div>
                  {selectedMethod === 'card' && (
                    <CheckCircle size={20} className="text-primary" />
                  )}
                </div>
              </div>
            </div>

            {selectedMethod === 'mpesa_stk' && (
              <div className="mb-6">
                <label className="block mb-2 font-semibold">Phone Number</label>
                <input
                  type="tel"
                  placeholder="254712345678"
                  {...register('phone', { required: selectedMethod === 'mpesa_stk' })}
                  className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            )}

            <Button
              type="submit"
              icon={ArrowDownLeft}
              fullWidth
              disabled={loading || !amount}
            >
              {loading ? 'Processing...' : 'Add Money via M-Pesa'}
            </Button>
          </div>
        </form>

        <div className="bg-[#FFF3E0] rounded-xl p-4 text-sm text-[#E65100]">
          💡 You'll receive an M-Pesa prompt on your phone. Enter your PIN to complete the transaction.
        </div>
      </div>
    </div>
  );
}
