import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: string;
  title: string;
  time: string;
  counterparty?: string;
}

interface UseTransactionsResult {
  transactions: Array<Transaction & { date: string }>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export const useTransactions = (
  limit: number = 20,
  currency?: string,
  filter?: 'all' | 'sent' | 'received'
): UseTransactionsResult => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchTransactions = async (reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (currency) params.set('currency', currency);
      if (cursor && !reset) params.set('cursor', cursor);

      const res = await fetch(`/api/wallet/transactions?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch transactions: ${res.statusText}`);
      }

      const data = await res.json();
      
      // Backend returns { ok: true, items, pagination: { cursor, hasMore, limit } }
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      const newTransactions = data.items || [];
      
      if (reset) {
        setTransactions(newTransactions);
      } else {
        setTransactions((prev) => [...prev, ...newTransactions]);
      }

      setCursor(data.pagination?.cursor || null);
      setHasMore(data.pagination?.hasMore || false);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
  }, [currency, filter]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(false);
    }
  };

  // Transform transactions to match frontend format
  const transformedTransactions = transactions.map((t) => ({
    ...t,
    type: t.type === 'credit' ? 'receive' : 'send',
    date: formatDate(t.time),
  }));

  // Apply filter if needed
  const filteredTransactions =
    filter === 'sent'
      ? transformedTransactions.filter((t) => t.type === 'send')
      : filter === 'received'
      ? transformedTransactions.filter((t) => t.type === 'receive')
      : transformedTransactions;

  return {
    transactions: filteredTransactions,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchTransactions(true),
  };
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
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
