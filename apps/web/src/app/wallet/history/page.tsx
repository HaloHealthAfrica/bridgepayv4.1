import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { TransactionRow } from '@/components/wallet/TransactionRow';
import { useTransactions } from '@/hooks/useTransactions';
import { useWallet } from '@/hooks/useWallet';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const { walletData } = useWallet();
  const { transactions, loading, hasMore, loadMore } = useTransactions(20, walletData?.currency, filter);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/wallet')}
            className="text-primary text-base font-semibold mb-4 hover:underline"
          >
            ← Back to Wallet
          </button>
          <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
          <p className="text-text-secondary">All your money movements</p>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'border-2 border-[#E0E0E0] bg-white text-text'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('sent')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'sent'
                  ? 'bg-primary text-white'
                  : 'border-2 border-[#E0E0E0] bg-white text-text'
              }`}
            >
              Sent
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'received'
                  ? 'bg-primary text-white'
                  : 'border-2 border-[#E0E0E0] bg-white text-text'
              }`}
            >
              Received
            </button>
          </div>

          {loading && transactions.length === 0 ? (
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-text-secondary">
              No transactions found
            </div>
          ) : (
            <>
              {transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onClick={() => {
                    // Could open modal here
                    console.log('Transaction clicked:', transaction);
                  }}
                />
              ))}
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-[#00695C] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

