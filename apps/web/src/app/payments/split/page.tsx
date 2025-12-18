import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { CurrencySelector } from '@/components/CurrencySelector';
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

interface Member {
  payee: string;
  method: 'stk' | 'wallet';
  amount: string;
}

function MemberRow({
  idx,
  member,
  onChange,
  splitType,
}: {
  idx: number;
  member: Member;
  onChange: (idx: number, member: Member) => void;
  splitType: 'equal' | 'custom';
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-4 bg-background rounded-xl">
      <div className="md:col-span-5">
        <input
          placeholder="Payee (phone or wallet)"
          value={member.payee}
          onChange={(e) => onChange(idx, { ...member, payee: e.target.value })}
          className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
        />
      </div>
      <div className="md:col-span-2">
        <select
          value={member.method}
          onChange={(e) => onChange(idx, { ...member, method: e.target.value as 'stk' | 'wallet' })}
          className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
        >
          <option value="stk">STK</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>
      <div className="md:col-span-3">
        <input
          type="number"
          disabled={splitType === 'equal'}
          placeholder={splitType === 'equal' ? 'Auto (equal split)' : 'Amount'}
          value={member.amount}
          onChange={(e) => onChange(idx, { ...member, amount: e.target.value })}
          className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary disabled:bg-background disabled:text-text-secondary"
        />
      </div>
      <div className="md:col-span-2 text-right text-sm text-text-secondary">
        Member {idx + 1}
      </div>
    </div>
  );
}

export default function SplitPaymentsPage() {
  const [step, setStep] = useState(1);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [total, setTotal] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [members, setMembers] = useState<Member[]>([
    { payee: '', method: 'stk', amount: '' },
    { payee: '', method: 'stk', amount: '' },
    { payee: '', method: 'stk', amount: '' },
  ]);
  const [createdGroup, setCreatedGroup] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onChangeMember = (idx: number, next: Member) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? next : m)));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!total || Number(total) <= 0) throw new Error('Total must be > 0');
      const apiMembers = members.map((m) => ({
        payee: m.payee,
        amount: splitType === 'equal' ? undefined : Number(m.amount || 0),
        metadata:
          m.method === 'stk'
            ? { method: 'stk', phone_number: m.payee }
            : { method: 'wallet', wallet_no: m.payee },
      }));
      const res = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          split_type: splitType,
          total_amount: Number(total),
          currency,
          members: apiMembers,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Create failed: ${res.status}`);
      return json;
    },
    onSuccess: (data) => {
      setCreatedGroup(data.group_id);
      setError(null);
      setStep(3);
      toast.success('Split payment group created!');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to create split group');
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/split/${createdGroup}`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Execute failed: ${res.status}`);
      return json;
    },
    onSuccess: (data) => {
      setExecResult(data);
      toast.success('Payments initiated!');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to execute payments');
    },
  });

  const detailsQuery = useQuery({
    queryKey: ['split', createdGroup],
    queryFn: async () => {
      const res = await fetch(`/api/payments/split/${createdGroup}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Fetch failed: ${res.status}`);
      return json;
    },
    enabled: !!createdGroup,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    completed: 'success',
    pending: 'pending',
    failed: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Split Payments</h1>
          <p className="text-text-secondary">Split a payment among multiple recipients</p>
        </div>

        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-6 text-error">
            {error}
          </div>
        )}

        {/* Step 1: Setup */}
        {step === 1 && (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h2 className="text-lg font-bold mb-4">Payment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Split Type</label>
                <select
                  value={splitType}
                  onChange={(e) => setSplitType(e.target.value as 'equal' | 'custom')}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                >
                  <option value="equal">Equal Split</option>
                  <option value="custom">Custom Amounts</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Total Amount</label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">Currency</label>
                <CurrencySelector value={currency} onChange={setCurrency} />
              </div>
            </div>
            <Button icon={ArrowRight} onClick={() => setStep(2)}>
              Next: Add Members
            </Button>
          </div>
        )}

        {/* Step 2: Members */}
        {step === 2 && (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Members</h2>
              <Button
                variant="secondary"
                icon={Plus}
                onClick={() =>
                  setMembers((m) => [...m, { payee: '', method: 'stk', amount: '' }])
                }
              >
                Add Member
              </Button>
            </div>
            <div className="space-y-3 mb-6">
              {members.map((m, i) => (
                <MemberRow
                  key={i}
                  idx={i}
                  member={m}
                  onChange={onChangeMember}
                  splitType={splitType}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                icon={Play}
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Group'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && createdGroup && (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Group Created</h2>
              <div className="bg-background rounded-xl p-4">
                <div className="text-sm text-text-secondary mb-1">Group ID</div>
                <code className="text-base font-mono font-semibold">{createdGroup}</code>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                icon={Play}
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending}
              >
                {executeMutation.isPending ? 'Starting…' : 'Collect Now'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => detailsQuery.refetch()}
              >
                Refresh Status
              </Button>
            </div>

            {execResult && (
              <div className="bg-background rounded-xl p-4 mb-6">
                <h3 className="font-semibold mb-3">Execution Results</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-text-secondary mb-1">Completed</div>
                    <div className="text-2xl font-bold text-success">{execResult.completed || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary mb-1">Pending</div>
                    <div className="text-2xl font-bold text-warning">{execResult.pending || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-secondary mb-1">Failed</div>
                    <div className="text-2xl font-bold text-error">{execResult.failed || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {detailsQuery.data && (
              <div>
                <h3 className="font-semibold mb-3">Members</h3>
                <div className="space-y-3">
                  {detailsQuery.data.members.map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-4 bg-background rounded-xl border border-[#E0E0E0]"
                    >
                      <div>
                        <div className="font-semibold mb-1">
                          Status: <StatusPill status={statusMap[m.status] || 'pending'} />
                        </div>
                        <div className="text-sm text-text-secondary">
                          Amount: {formatCurrency(m.amount || 0, detailsQuery.data.group.currency)}
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary">
                        {m.payment_id ? `Payment ${m.payment_id}` : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

