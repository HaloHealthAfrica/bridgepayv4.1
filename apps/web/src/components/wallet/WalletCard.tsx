import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

interface WalletCardProps {
  balance: number;
  pending: number;
  escrow: number;
  currency?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  pending,
  escrow,
  currency = 'KES',
}) => {
  return (
    <div
      className="bg-gradient-to-br from-primary to-[#004D40] rounded-card p-6 text-white shadow-lg mb-6"
      style={{
        boxShadow: '0 4px 12px rgba(0,121,107,0.2)',
      }}
    >
      <div className="text-sm opacity-90 mb-2">Total Balance</div>
      <div className="text-4xl md:text-5xl font-bold mb-4">
        {formatCurrency(balance, currency)}
      </div>
      <div className="flex gap-6 md:gap-8 text-sm">
        <div>
          <div className="opacity-80 mb-1">Pending</div>
          <div className="font-semibold">
            {formatCurrency(pending, currency)}
          </div>
        </div>
        <div>
          <div className="opacity-80 mb-1">In Escrow</div>
          <div className="font-semibold">
            {formatCurrency(escrow, currency)}
          </div>
        </div>
      </div>
    </div>
  );
};

