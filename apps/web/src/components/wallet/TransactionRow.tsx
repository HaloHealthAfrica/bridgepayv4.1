import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { formatCurrency } from '@/utils/formatCurrency';

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'credit' | 'debit';
  title: string;
  amount: number;
  date?: string;
  time?: string;
  status: 'pending' | 'success' | 'failed' | string;
  currency?: string;
}

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

function formatTransactionDate(dateString?: string): string {
  if (!dateString) return 'Recently';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onClick,
}) => {
  const isPositive = transaction.type === 'receive' || transaction.type === 'credit';
  const Icon = isPositive ? ArrowDownLeft : ArrowUpRight;
  const currency = transaction.currency || 'KES';
  const dateStr = transaction.date || transaction.time || '';

  // Map backend status to frontend status
  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    posted: 'success',
    pending: 'pending',
    failed: 'failed',
    success: 'success',
  };
  const displayStatus = statusMap[transaction.status] || 'pending';

  return (
    <div
      onClick={onClick}
      className="flex items-center p-4 bg-surface rounded-xl mb-2 cursor-pointer transition-transform hover:scale-[1.01] border border-[#E0E0E0]"
    >
      <div
        className={`rounded-xl p-3 mr-3 ${
          isPositive ? 'bg-[#E8F5E9]' : 'bg-[#FFEBEE]'
        }`}
      >
        <Icon
          size={20}
          color={isPositive ? '#4CAF50' : '#F44336'}
        />
      </div>
      <div className="flex-1">
        <div className="font-semibold mb-1">{transaction.title}</div>
        <div className="text-sm text-text-secondary">{formatTransactionDate(dateStr)}</div>
      </div>
      <div className="text-right">
        <div
          className={`font-bold text-base mb-1 ${
            isPositive ? 'text-success' : 'text-text'
          }`}
        >
          {isPositive ? '+' : '-'} {formatCurrency(transaction.amount, currency)}
        </div>
        <StatusPill status={displayStatus} />
      </div>
    </div>
  );
};

