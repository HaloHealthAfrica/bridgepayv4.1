import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { ArrowLeft, Plus, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import { useNavigate } from 'react-router';

function AdminBillingCatalogContent() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['billing-fees'],
    queryFn: async () => {
      const res = await fetch('/api/billing/fees');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch fees: [${res.status}] ${res.statusText}`,
        );
      }
      const data = await res.json();
      // API returns { ok: true, fees } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch fees');
      }
      return data;
    },
    refetchOnWindowFocus: false,
  });

  const fees = data?.fees || [];

  const [form, setForm] = useState({
    code: '',
    name: '',
    fee_type: 'percentage',
    applies_to: 'MERCHANT_PAYMENT',
    payer: 'merchant',
    rate: 0.02,
    amount: '',
    status: 'active',
  });

  const createFee = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/billing/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to create fee: [${res.status}] ${res.statusText}`,
        );
      }
      const data = await res.json();
      // API returns { ok: true, ... } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to create fee');
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-fees'] });
      toast.success('Fee created successfully');
      // Reset form
      setForm({
        code: '',
        name: '',
        fee_type: 'percentage',
        applies_to: 'MERCHANT_PAYMENT',
        payer: 'merchant',
        rate: 0.02,
        amount: '',
        status: 'active',
      });
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to create fee');
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/fees/seed', { method: 'POST' });
      if (!res.ok)
        throw new Error(
          `Failed to seed defaults: [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing-fees'] });
      toast.success('Default fees seeded');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to seed defaults');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (payload.fee_type === 'percentage') payload.amount = null;
    if (payload.fee_type === 'flat') payload.rate = null;
    createFee.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Billing – Fee Catalog</h1>
            <p className="text-text-secondary">Create and manage fee rules</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/admin')}>
              Back to Admin
            </Button>
            <Button
              variant="secondary"
              icon={Database}
              onClick={() => seedDefaults.mutate()}
              disabled={seedDefaults.isPending}
            >
              {seedDefaults.isPending ? 'Seeding…' : 'Seed Defaults'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Form */}
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus size={20} />
              Add / Update Fee
            </h2>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Code</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="FEE_CODE"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Name</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    placeholder="Fee Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Fee Type</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    value={form.fee_type}
                    onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat</option>
                    <option value="tiered">Tiered</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Applies To</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    value={form.applies_to}
                    onChange={(e) => setForm({ ...form, applies_to: e.target.value })}
                  >
                    <option>TOPUP</option>
                    <option>WITHDRAWAL</option>
                    <option>MERCHANT_PAYMENT</option>
                    <option>SPLIT</option>
                    <option>PROJECT</option>
                    <option>SCHEDULED</option>
                    <option>FX</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-text mb-2">Payer</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                    value={form.payer}
                    onChange={(e) => setForm({ ...form, payer: e.target.value })}
                  >
                    <option>merchant</option>
                    <option>customer</option>
                    <option>platform</option>
                  </select>
                </div>
                {form.fee_type === 'percentage' ? (
                  <div>
                    <label className="block text-sm font-semibold text-text mb-2">
                      Rate (e.g. 0.02)
                    </label>
                    <input
                      className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                      type="number"
                      step="0.0001"
                      placeholder="0.02"
                      value={form.rate}
                      onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-text mb-2">
                      Flat Amount
                    </label>
                    <input
                      className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <Button type="submit" icon={Plus} disabled={createFee.isPending} fullWidth>
                {createFee.isPending ? 'Saving...' : 'Save Fee'}
              </Button>
              {createFee.error && (
                <div className="bg-[#FFEBEE] border border-error rounded-xl p-3 text-error text-sm">
                  {(createFee.error as Error).message || String(createFee.error)}
                </div>
              )}
            </form>
          </div>

          {/* Active Fees List */}
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Active Fees</h2>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => qc.invalidateQueries({ queryKey: ['billing-fees'] })}
              >
                Refresh
              </Button>
            </div>
            {isLoading ? (
              <div className="text-text-secondary text-center py-8">Loading...</div>
            ) : error ? (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
                Could not load fees
              </div>
            ) : fees.length === 0 ? (
              <div className="text-text-secondary text-center py-8">No fees yet</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-4 px-4 py-3 text-xs font-semibold text-text-secondary border-b bg-background min-w-[800px]">
                  <div>Code</div>
                  <div>Name</div>
                  <div>Type</div>
                  <div>Scope</div>
                  <div>Payer</div>
                  <div>Value</div>
                  <div>Status</div>
                </div>
                {fees.map((f: any) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[800px]"
                  >
                    <div className="font-medium">{f.code}</div>
                    <div>{f.name}</div>
                    <div className="text-sm capitalize">{f.fee_type}</div>
                    <div className="text-sm">{f.applies_to}</div>
                    <div className="text-sm capitalize">{f.payer}</div>
                    <div className="font-semibold">
                      {f.fee_type === 'percentage'
                        ? `${(Number(f.rate) * 100).toFixed(2)}%`
                        : formatCurrency(f.amount || 0, 'KES')}
                    </div>
                    <div>
                      <StatusPill status={f.status === 'active' ? 'success' : 'pending'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

