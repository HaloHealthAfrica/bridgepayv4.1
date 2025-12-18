import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowDownLeft, ArrowUpRight, QrCode, History, BarChart3 } from 'lucide-react';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { WalletCard } from '@/components/wallet/WalletCard';
import { QuickAction } from '@/components/wallet/QuickAction';
import { TransactionRow } from '@/components/wallet/TransactionRow';
import { StatusPill } from '@/components/common/StatusPill';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/utils/formatCurrency';

function WalletContent() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { walletData, loading: walletLoading, error: walletError } = useWallet();
  const { transactions, loading: transactionsLoading } = useTransactions(3);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const userRole = session?.user?.role || 'customer';
  const isMerchant = userRole === 'merchant';

  if (walletLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  if (walletError || !walletData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-error">Error: {walletError || 'Failed to load wallet'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {isMerchant ? 'Merchant' : 'User'}! 👋
          </h1>
          <p className="text-text-secondary">Manage your money with ease</p>
        </div>

        <WalletCard
          balance={walletData.balance}
          pending={walletData.pending}
          escrow={walletData.escrow || 0}
          currency={walletData.currency}
        />

        <div className="flex gap-4 mb-8">
          <QuickAction
            icon={ArrowDownLeft}
            label="Add Money"
            onClick={() => navigate('/wallet/add-money')}
          />
          <QuickAction
            icon={ArrowUpRight}
            label="Send Money"
            onClick={() => navigate('/wallet/send-money')}
          />
          <QuickAction
            icon={QrCode}
            label="QR Pay"
            onClick={() => navigate('/wallet/qr-pay')}
          />
          <QuickAction
            icon={History}
            label="History"
            onClick={() => navigate('/wallet/history')}
          />
        </div>

        {isMerchant && (
          <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Today's Sales</h2>
              <BarChart3 size={20} className="text-primary" />
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              {formatCurrency(45230, walletData.currency)}
            </div>
            <div className="text-sm text-success">↑ 12% from yesterday</div>
          </div>
        )}

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Recent Transactions</h2>
            <span
              className="text-primary text-sm cursor-pointer font-semibold"
              onClick={() => navigate('/wallet/history')}
            >
              View All →
            </span>
          </div>
          {transactionsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
              <div className="h-16 bg-gray-200 rounded-xl" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center text-text-secondary">
              No transactions yet
            </div>
          ) : (
            transactions.slice(0, 3).map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onClick={() => setSelectedTransaction(transaction)}
              />
            ))
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="bg-white rounded-card p-8 max-w-md w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  selectedTransaction.type === 'receive'
                    ? 'bg-[#E8F5E9]'
                    : 'bg-[#FFEBEE]'
                }`}
              >
                {selectedTransaction.type === 'receive' ? (
                  <ArrowDownLeft size={40} className="text-success" />
                ) : (
                  <ArrowUpRight size={40} className="text-error" />
                )}
              </div>
              <div className="text-4xl font-bold mb-2">
                {selectedTransaction.type === 'receive' ? '+' : '-'}{' '}
                {formatCurrency(
                  selectedTransaction.amount,
                  selectedTransaction.currency || 'KES'
                )}
              </div>
              <StatusPill status={selectedTransaction.status} />
            </div>

            <div className="bg-background rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-3">
                <span className="text-text-secondary">To/From</span>
                <span className="font-semibold">{selectedTransaction.title}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-text-secondary">Date</span>
                <span className="font-semibold">{selectedTransaction.date}</span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-text-secondary">Transaction ID</span>
                <span className="font-semibold text-xs">
                  BR{selectedTransaction.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Fee</span>
                <span className="font-semibold">
                  {formatCurrency(0, selectedTransaction.currency || 'KES')}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setSelectedTransaction(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  alert('Receipt downloaded!');
                }}
              >
                Get Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

