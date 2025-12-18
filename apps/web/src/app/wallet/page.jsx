import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { TransactionRow } from '@/components/wallet/TransactionRow';
import { WalletCard } from '@/components/wallet/WalletCard';
import { QuickAction } from '@/components/wallet/QuickAction';
import useUser from '@/utils/useUser';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  RefreshCw,
  QrCode,
  Calendar,
  Users,
  Briefcase,
  Shield,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export default function WalletPage() {
  const { data: user, loading: userLoading } = useUser();
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const walletQuery = useQuery({
    queryKey: ['wallet-summary'],
    queryFn: async () => {
      const res = await fetch('/api/wallet/summary');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch wallet: [${res.status}] ${res.statusText}`,
        );
      }
      const data = await res.json();
      // API returns { ok: true, balance, pending, currency } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch wallet');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activityQuery = useQuery({
    queryKey: ['wallet-activity', filter],
    queryFn: async () => {
      const res = await fetch(`/api/activity?limit=20&filter=${filter}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch activity: [${res.status}] ${res.statusText}`,
        );
      }
      const data = await res.json();
      // API returns { ok: true, items } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch activity');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const sourcesQuery = useQuery({
    queryKey: ['wallet-sources'],
    queryFn: async () => {
      const res = await fetch('/api/wallet/sources');
      if (!res.ok) {
        throw new Error(
          `Failed to fetch sources: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const seedMutation = useMutation({
    mutationFn: async (balances: any) => {
      const res = await fetch('/api/wallet/sources/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(balances || {}),
      });
      if (!res.ok) {
        throw new Error(
          `Failed to seed: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-sources'] });
      toast.success('Test balances seeded');
    },
    onError: (e: any) => {
      console.error(e);
      toast.error(e.message || 'Failed to seed balances');
    },
  });

  const sourceLabel = (s: string) => {
    if (!s) return '-';
    const v = String(s).toLowerCase();
    if (v === 'kcb') return 'KCB Wallet';
    if (v === 'dtb') return 'DTB Wallet';
    if (v === 'mpesa') return 'M-Pesa';
    return 'Bridge';
  };

  const sources = sourcesQuery.data?.sources || [];
  const allZeroOrMissing =
    !sources.length || sources.every((s: any) => Number(s.balance || 0) === 0);

  // Transform activity data for TransactionRow
  const transactions = (activityQuery.data?.items || []).map((t: any) => ({
    id: t.id || Math.random().toString(),
    type: t.type === 'credit' ? 'receive' : 'send',
    title: t.title || (t.type === 'credit' ? 'Received' : 'Sent'),
    amount: t.amount || 0,
    date: t.time || 'recent',
    status: 'success',
    currency: 'KES',
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Wallet</h1>
          <p className="text-text-secondary">Manage your funds and transactions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Balance and Transactions */}
          <div className="lg:col-span-2 space-y-6">
            <WalletCard
              balance={walletQuery.data?.balance ?? 0}
              pending={walletQuery.data?.pending ?? 0}
              escrow={0}
              currency="KES"
            />

            {/* Quick Actions */}
            <div className="flex gap-4">
              <QuickAction
                icon={ArrowDownRight}
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
            </div>

            {/* Transactions */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Transactions</h3>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-text-secondary" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary text-sm font-semibold"
                  >
                    <option value="all">All</option>
                    <option value="sent">Sent</option>
                    <option value="received">Received</option>
                  </select>
                </div>
              </div>
              {activityQuery.isLoading ? (
                <div className="text-center py-8 text-text-secondary">Loading...</div>
              ) : activityQuery.error ? (
                <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error text-sm">
                  Could not load transactions
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  No transactions yet
                </div>
              ) : (
                <div>
                  {transactions.map((t) => (
                    <TransactionRow key={t.id} transaction={t} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Virtual Wallets & Quick Actions */}
          <div className="space-y-6">
            {/* Virtual Wallets */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Virtual Wallets</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={() => sourcesQuery.refetch()}
                  >
                    Refresh
                  </Button>
                  {allZeroOrMissing && (
                    <Button
                      variant="secondary"
                      onClick={() => seedMutation.mutate({})}
                      disabled={seedMutation.isPending}
                    >
                      {seedMutation.isPending ? 'Seeding...' : 'Seed Test'}
                    </Button>
                  )}
                </div>
              </div>
              {sourcesQuery.isLoading ? (
                <div className="text-center py-4 text-text-secondary">Loading...</div>
              ) : sourcesQuery.error ? (
                <div className="text-sm text-error">
                  Could not load sources
                </div>
              ) : sources.length ? (
                <div className="space-y-2">
                  {sources.map((s: any) => (
                    <div
                      key={`${s.source}-${s.currency}`}
                      className="flex items-center justify-between p-3 bg-background rounded-xl border border-[#E0E0E0]"
                    >
                      <div className="text-sm font-semibold">
                        {sourceLabel(s.source)}
                      </div>
                      <div className="text-sm font-bold">
                        {formatCurrency(s.balance || 0, s.currency || 'KES')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-secondary text-center py-4">
                  No virtual wallets yet.{' '}
                  <button
                    onClick={() => seedMutation.mutate({})}
                    disabled={seedMutation.isPending}
                    className="text-primary hover:underline font-semibold disabled:opacity-60"
                  >
                    {seedMutation.isPending ? 'Seeding...' : 'Seed test balances'}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/qr-payment')}
                  fullWidth
                >
                  Generate QR
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/payments/scheduled')}
                  fullWidth
                >
                  Scheduled
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/payments/split')}
                  fullWidth
                >
                  Split
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/projects')}
                  fullWidth
                >
                  Projects
                </Button>
              </div>
            </div>

            {/* Security */}
            <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Shield size={20} />
                Security
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-success">
                  <Shield size={16} />
                  Protected by 256-bit encryption
                </div>
                <div className="flex items-center gap-2 text-success">
                  <Shield size={16} />
                  2FA available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
