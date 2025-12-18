import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { walletAPI } from '@/services/api';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/formatCurrency';

export default function SendMoneyPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch } = useForm();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const { walletData, refetch } = useWallet();
  const amount = watch('amount');
  
  // Set currency from wallet on mount
  useEffect(() => {
    if (walletData?.currency) {
      setCurrency(walletData.currency);
    }
  }, [walletData?.currency]);

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const response = await walletAPI.transfer({
        amount: Number(data.amount),
        recipient_email: data.recipient || undefined,
        recipient_user_id: data.recipient || undefined,
        narration: data.note || 'P2P transfer',
        currency,
      });

      if (response.data.ok) {
        toast.success('Transfer initiated!');
        refetch();
        setTimeout(() => {
          navigate('/wallet');
        }, 2000);
      } else {
        toast.error(response.data.error || 'Failed to transfer');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const transferFee = 0;
  const total = amount ? Number(amount) + transferFee : 0;

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
          <h1 className="text-3xl font-bold mb-2">Send Money</h1>
          <p className="text-text-secondary">Transfer to any Bridge wallet</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="mb-6">
              <label className="block mb-2 font-semibold">Recipient</label>
              <input
                type="text"
                placeholder="Phone number or Bridge ID"
                {...register('recipient', { required: true })}
                className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-semibold">Amount ({currency})</label>
              <input
                type="number"
                placeholder="0"
                {...register('amount', { required: true, min: 1 })}
                className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-semibold">Note (Optional)</label>
              <input
                type="text"
                placeholder="What's this for?"
                {...register('note')}
                className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="bg-primary-light rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span>Transfer Fee</span>
                <span className="font-semibold">{formatCurrency(transferFee, currency)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-primary">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <Button
              type="submit"
              icon={ArrowUpRight}
              fullWidth
              disabled={loading || !amount}
            >
              {loading ? 'Processing...' : 'Send Money'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

