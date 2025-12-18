import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { CurrencySelector } from '@/components/CurrencySelector';
import { QrCode, Plus, RefreshCw, ExternalLink, Copy, Image, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';
import useUser from '@/utils/useUser';

export default function QRMgmtPage() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const list = useQuery({
    queryKey: ['qr-list'],
    queryFn: async () => {
      const res = await fetch(`/api/qr?limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'forbidden');
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState({
    mode: 'pay' as 'pay' | 'receive',
    amount: '',
    currency: 'KES',
    expiresIn: 15 * 60, // 15 minutes in seconds
  });

  const gen = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/qr/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['qr-list'] });
      toast.success('QR code generated successfully');
      // Reset form
      setForm({
        mode: 'pay',
        amount: '',
        currency: 'KES',
        expiresIn: 15 * 60,
      });
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to generate QR code');
    },
  });

  const deactivate = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(`/api/qr/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'failed');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-list'] });
      toast.success('QR code deactivated');
    },
    onError: (e: any) => {
      toast.error(e.message || 'Failed to deactivate QR code');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  if (list.isError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-4xl mx-auto">
          <div className="bg-[#FFEBEE] border border-error rounded-card p-4 text-error">
            Forbidden. Please sign in as merchant/admin.
          </div>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    active: 'success',
    used: 'success',
    expired: 'failed',
    disabled: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">QR Codes</h1>
          <p className="text-text-secondary">Generate and manage QR codes for payments</p>
        </div>

        {/* Generate Form */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <QrCode size={20} />
            Generate QR Code
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Type</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value as 'pay' | 'receive' }))}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              >
                <option value="pay">Pay</option>
                <option value="receive">Receive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Currency</label>
              <CurrencySelector value={form.currency} onChange={(val) => setForm((f) => ({ ...f, currency: val }))} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Expiry (seconds)
              </label>
              <input
                type="number"
                value={form.expiresIn}
                onChange={(e) => setForm((f) => ({ ...f, expiresIn: Number(e.target.value) }))}
                min="60"
                max="86400"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <Button
            icon={Plus}
            onClick={() =>
              gen.mutate({
                ...form,
                amount: form.amount ? Number(form.amount) : undefined,
              })
            }
            disabled={gen.isPending}
          >
            {gen.isPending ? 'Generating…' : 'Generate QR'}
          </Button>
          {gen.data?.url && (
            <div className="mt-4 p-4 bg-primary-light rounded-xl">
              <div className="text-sm font-semibold text-primary mb-2">Generated QR Link:</div>
              <a
                href={gen.data.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {gen.data.url}
              </a>
            </div>
          )}
        </div>

        {/* QR Codes List */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
            <div className="font-semibold">Latest QR Codes</div>
            <Button
              variant="secondary"
              icon={RefreshCw}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['qr-list'] })}
            >
              Refresh
            </Button>
          </div>
          {list.isLoading ? (
            <div className="p-8 text-center text-text-secondary">Loading…</div>
          ) : (list.data?.items || []).length === 0 ? (
            <div className="p-12 text-center">
              <QrCode size={48} className="text-text-secondary mx-auto mb-4" />
              <div className="font-semibold text-text mb-2">No QR codes yet</div>
              <div className="text-text-secondary">Generate your first QR code above</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-4 px-6 py-4 text-xs font-semibold text-text-secondary border-b bg-background min-w-[800px]">
                <div>Code</div>
                <div>Mode</div>
                <div>Amount</div>
                <div>Currency</div>
                <div>Status</div>
                <div>Expires</div>
                <div>Actions</div>
              </div>
              {(list.data?.items || []).map((r: any) => (
                <div
                  key={r.code}
                  className="grid grid-cols-7 gap-4 px-6 py-4 border-t border-[#E0E0E0] hover:bg-background transition-colors items-center min-w-[800px]"
                >
                  <div className="font-mono text-sm">{r.code}</div>
                  <div className="text-sm capitalize">{r.mode}</div>
                  <div className="font-semibold">
                    {r.amount ? formatCurrency(r.amount, r.currency || 'KES') : '-'}
                  </div>
                  <div className="text-sm">{r.currency || 'KES'}</div>
                  <div>
                    <StatusPill status={statusMap[r.status] || 'pending'} />
                  </div>
                  <div className="text-sm text-text-secondary">
                    {r.expires_at ? new Date(r.expires_at).toLocaleString() : '-'}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => window.open(`/q/${r.code}`, '_blank')}
                      className="px-2 py-1 border-2 border-primary rounded-lg text-primary font-semibold text-xs hover:bg-primary-light transition-colors flex items-center gap-1"
                      title="Open link"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/q/${r.code}`)}
                      className="px-2 py-1 border-2 border-[#E0E0E0] rounded-lg text-text font-semibold text-xs hover:bg-background transition-colors flex items-center gap-1"
                      title="Copy link"
                    >
                      <Copy size={12} />
                    </button>
                    <a
                      href={`/api/qr/image/${r.code}?format=svg&size=320`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 border-2 border-[#E0E0E0] rounded-lg text-text font-semibold text-xs hover:bg-background transition-colors flex items-center gap-1"
                      title="QR SVG"
                    >
                      <Image size={12} />
                      SVG
                    </a>
                    <a
                      href={`/api/qr/image/${r.code}?format=png&size=512`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 border-2 border-[#E0E0E0] rounded-lg text-text font-semibold text-xs hover:bg-background transition-colors flex items-center gap-1"
                      title="QR PNG"
                    >
                      <Image size={12} />
                      PNG
                    </a>
                    {r.status === 'active' && (
                      <button
                        onClick={() => deactivate.mutate(r.code)}
                        disabled={deactivate.isPending}
                        className="px-2 py-1 border-2 border-error rounded-lg text-error font-semibold text-xs hover:bg-[#FFEBEE] transition-colors flex items-center gap-1"
                        title="Deactivate"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

