import { useState, useEffect } from 'react';

interface WalletData {
  balance: number;
  pending: number;
  escrow: number;
  currency: string;
}

export const useWallet = (currency?: string) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (currency) params.set('currency', currency);
      
      const res = await fetch(`/api/wallet/summary?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch wallet: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Backend returns { ok: true, balance, pending, currency }
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch wallet');
      }
      
      // Calculate escrow separately - for now set to 0
      // TODO: Get escrow from projects or separate endpoint if available
      setWalletData({
        balance: data.balance || 0,
        pending: data.pending || 0,
        escrow: 0, // TODO: Calculate from projects in escrow
        currency: data.currency || 'KES',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet data');
      setWalletData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [currency]);

  return { walletData, loading, error, refetch: fetchWallet };
};
