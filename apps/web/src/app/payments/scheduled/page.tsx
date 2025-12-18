import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { Calendar, Play, Pause, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function ScheduledPaymentsPage() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [method, setMethod] = useState<'stk' | 'wallet'>('stk');
  const [payee, setPayee] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ['scheduled', { status: statusFilter }],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/payments/scheduled?status=${encodeURIComponent(statusFilter)}`
        : '/api/payments/scheduled';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/payments/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Create failed: ${res.status}`);
        (err as any).response = json || text;
        throw err;
      }
      return json;
    },
    onSuccess: () => {
      setMessage('Scheduled payment created');
      setError(null);
      toast.success('Scheduled payment created');
      qc.invalidateQueries({ queryKey: ['scheduled'] });
      // Reset form
      setAmount('');
      setPayee('');
    },
    onError: (e: any) => {
      console.error(e);
      const errorMsg = e?.response?.error || e.message;
      setError(errorMsg);
      setMessage(null);
      toast.error(errorMsg || 'Failed to create scheduled payment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: any }) => {
      const res = await fetch(`/api/payments/scheduled/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled'] });
      toast.success('Schedule updated');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to update schedule');
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/scheduled/run`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Run failed: ${res.status}`);
      return json;
    },
    onSuccess: (data) => {
      toast.success(`Triggered ${data.triggered || 0} payments`);
      qc.invalidateQueries({ queryKey: ['scheduled'] });
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to run scheduled payments');
    },
  });

  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'merchant';

  const onCreate = () => {
    setError(null);
    setMessage(null);
    if (!amount || Number(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!payee.trim()) {
      setError(method === 'stk' ? 'Phone number is required' : 'Wallet number is required');
      return;
    }

    const metadata =
      method === 'stk'
        ? { method: 'stk', phone_number: payee }
        : { method: 'wallet', wallet_no: payee };
    createMutation.mutate({
      amount: Number(amount),
      cadence,
      currency: 'KES',
      payee,
      metadata,
    });
  };

  const items = useMemo(() => schedulesQuery.data?.items || [], [schedulesQuery.data]);

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    active: 'success',
    paused: 'pending',
    failed: 'failed',
    cancelled: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Scheduled Payments</h1>
          <p className="text-text-secondary">Create and manage your recurring payments</p>
        </div>

        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-6 text-error">
            {error}
          </div>
        )}
        {message && (
          <div className="bg-[#E8F5E9] border border-success rounded-xl p-4 mb-6 text-success">
            {message}
          </div>
        )}

        {/* Create Form */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
          <h2 className="text-lg font-bold mb-4">Create Scheduled Payment</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Amount (KES)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Cadence</label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as typeof cadence)}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              >
                <option value="stk">STK Push</option>
                <option value="wallet">Wallet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                {method === 'stk' ? 'Phone Number' : 'Wallet Number'}
              </label>
              <input
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder={method === 'stk' ? '0712 345 678' : 'Wallet number'}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button icon={Plus} onClick={onCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Schedule'}
            </Button>
            {isAdmin && (
              <Button
                variant="secondary"
                icon={Play}
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
              >
                {runMutation.isPending ? 'Running…' : 'Run Due Now'}
              </Button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              !statusFilter
                ? 'bg-primary text-white'
                : 'border-2 border-[#E0E0E0] bg-white text-text'
            }`}
          >
            All
          </button>
          {['active', 'paused', 'failed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'border-2 border-[#E0E0E0] bg-white text-text'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Schedules List */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background">
            <div className="col-span-3">Next Run</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Cadence</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>
          {schedulesQuery.isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-background rounded-full mx-auto mb-4 flex items-center justify-center">
                <Calendar size={32} className="text-text-secondary" />
              </div>
              <div className="font-semibold text-text mb-2">No schedules yet</div>
              <div className="text-text-secondary text-sm">
                Create your first scheduled payment using the form above.
              </div>
            </div>
          ) : (
            items.map((s: any) => (
              <div
                key={s.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-[#E0E0E0] hover:bg-background transition-colors items-center"
              >
                <div className="col-span-3 text-sm">
                  {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}
                </div>
                <div className="col-span-2 font-semibold">
                  {formatCurrency(s.amount || 0, s.currency || 'KES')}
                </div>
                <div className="col-span-2 text-sm capitalize">{s.cadence || '—'}</div>
                <div className="col-span-2">
                  <StatusPill status={statusMap[s.status] || 'pending'} />
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  {s.status !== 'active' && s.status !== 'cancelled' && (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: s.id,
                          patch: { status: 'active' },
                        })
                      }
                      className="px-3 py-1.5 border-2 border-primary rounded-lg text-primary font-semibold text-sm hover:bg-primary-light transition-colors"
                    >
                      <Play size={14} className="inline mr-1" />
                      Activate
                    </button>
                  )}
                  {s.status === 'active' && (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: s.id,
                          patch: { status: 'paused' },
                        })
                      }
                      className="px-3 py-1.5 border-2 border-warning rounded-lg text-warning font-semibold text-sm hover:bg-[#FFF3E0] transition-colors"
                    >
                      <Pause size={14} className="inline mr-1" />
                      Pause
                    </button>
                  )}
                  {s.status !== 'cancelled' && (
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: s.id,
                          patch: { status: 'cancelled' },
                        })
                      }
                      className="px-3 py-1.5 border-2 border-error rounded-lg text-error font-semibold text-sm hover:bg-[#FFEBEE] transition-colors"
                    >
                      <X size={14} className="inline mr-1" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

