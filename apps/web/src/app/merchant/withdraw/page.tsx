import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Download, Phone, Building, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

function MerchantWithdrawContent() {
  const navigate = useNavigate();
  const { walletData } = useWallet();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'mpesa' | 'bank'>('mpesa');

  const availableBalance = walletData?.balance || 890320;

  const handleWithdraw = () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amountNum > availableBalance) {
      toast.error(`Amount cannot exceed available balance`);
      return;
    }
    // In real app, this would call the withdrawal API
    toast.success('Withdrawal initiated!');
    navigate('/merchant/dashboard');
  };

  const fee = method === 'mpesa' ? Math.min(amountNum * 0.01, 50) : 150;
  const amountNum = Number(amount) || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/merchant/dashboard')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Withdraw Funds</h1>
          <p className="text-text-secondary">Transfer to your M-Pesa or Bank Account</p>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="bg-primary-light rounded-xl p-5 mb-6 text-center">
            <div className="text-sm text-text-secondary mb-2">Available Balance</div>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(availableBalance, 'KES')}
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-3 font-semibold">Withdrawal Method</label>
            <div className="flex flex-col gap-3">
              <div
                onClick={() => setMethod('mpesa')}
                className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                  method === 'mpesa'
                    ? 'border-primary bg-primary-light'
                    : 'border-[#E0E0E0]'
                }`}
              >
                <Phone size={24} className={method === 'mpesa' ? 'text-primary' : 'text-text-secondary'} />
                <div className="flex-1">
                  <div className="font-semibold">M-Pesa</div>
                  <div className="text-sm text-text-secondary">0722 123 456</div>
                </div>
                {method === 'mpesa' && <CheckCircle size={20} className="text-primary" />}
              </div>
              <div
                onClick={() => setMethod('bank')}
                className={`p-4 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${
                  method === 'bank'
                    ? 'border-primary bg-primary-light'
                    : 'border-[#E0E0E0]'
                }`}
              >
                <Building size={24} className={method === 'bank' ? 'text-primary' : 'text-text-secondary'} />
                <div className="flex-1">
                  <div className="font-semibold">Bank Transfer</div>
                  <div className="text-sm text-text-secondary">KCB Bank - ***4567</div>
                </div>
                {method === 'bank' && <CheckCircle size={20} className="text-primary" />}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-semibold">Amount ({walletData?.currency || 'KES'})</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={availableBalance}
              className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
            />
          </div>

          <div className="bg-[#E3F2FD] rounded-xl p-4 mb-6 text-sm">
            <div className="font-semibold mb-1">💡 Withdrawal Fee</div>
            <div className="text-text-secondary">
              M-Pesa: 1% (max {formatCurrency(50, 'KES')}) • Bank: {formatCurrency(150, 'KES')} flat fee
            </div>
          </div>

          <Button
            icon={Download}
            fullWidth
            onClick={handleWithdraw}
            disabled={!amount || amountNum <= 0}
          >
            Withdraw to {method === 'mpesa' ? 'M-Pesa' : 'Bank'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MerchantWithdrawPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantWithdrawContent />
    </ProtectedRoute>
  );
}

