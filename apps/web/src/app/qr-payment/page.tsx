import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { Camera, Upload, QrCode, Smartphone, Wallet, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

export default function QrPaymentPage() {
  const [amount, setAmount] = useState('100');
  const [desc, setDesc] = useState('');
  const [format, setFormat] = useState('svg');
  const [generated, setGenerated] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [walletNo, setWalletNo] = useState('11391837');
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'pay',
          amount: Number(amount) || undefined,
          currency: 'KES',
          metadata: { description: desc || undefined },
        }),
      });
      if (!res.ok) {
        throw new Error(
          `Failed to generate QR: [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => {
      setGenerated(data);
      toast.success('QR code generated successfully');
    },
    onError: (e: any) => {
      console.error(e);
      setError(e.message || 'Could not generate QR');
      toast.error(e.message || 'Could not generate QR');
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ method }: { method: 'stk' | 'wallet' }) => {
      if (!generated?.code) return;
      const payload: any = { code: generated.code, method };
      if (method === 'stk') payload.phone_number = phone;
      if (method === 'wallet') payload.wallet_no = walletNo;
      const res = await fetch('/api/qr/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Pay failed [${res.status}]`);
      }
      return json;
    },
    onSuccess: (r) => {
      if (typeof window !== 'undefined' && r?.payment_id) {
        window.location.href = `/pay/success/${r.payment_id}`;
      }
    },
    onError: (e: any) => {
      console.error(e);
      setError(String(e?.message || e));
      toast.error(e?.message || 'Payment failed');
    },
  });

  const QuickAmount = ({ v }: { v: number }) => (
    <button
      onClick={() => setAmount(v.toString())}
      className="px-3 py-2 rounded-xl border-2 border-[#E0E0E0] hover:border-primary hover:bg-primary-light text-sm font-semibold transition-colors"
    >
      KES {v}
    </button>
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">QR Payment</h1>
          <p className="text-text-secondary">Scan QR codes or generate your own</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Scan to Pay */}
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Smartphone size={20} />
              Scan to Pay
            </h2>
            <div className="rounded-xl border-2 border-dashed border-[#E0E0E0] h-[300px] flex items-center justify-center bg-background">
              <div className="text-center">
                <Camera size={48} className="text-text-secondary mx-auto mb-4" />
                <div className="text-sm text-text-secondary mb-4">
                  Camera preview will appear here
                </div>
                <Button icon={Camera}>Start Camera</Button>
                <div className="mt-4 text-xs text-text-secondary">or</div>
                <Button
                  variant="secondary"
                  icon={Upload}
                  onClick={() => toast.info('Upload QR image feature coming soon')}
                  className="mt-2"
                >
                  Upload QR Image
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm font-semibold text-text-secondary mb-2">Recent scans</div>
              <div className="text-xs text-text-secondary">No recent scans</div>
            </div>
          </div>

          {/* Right: Generate QR */}
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <QrCode size={20} />
              Generate QR Code
            </h2>
            {error && (
              <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-4 text-error text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
                <div className="flex items-center gap-2 mt-2">
                  {[10, 25, 50, 100].map((v) => (
                    <QuickAmount key={v} v={v} />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  placeholder="Payment description"
                />
              </div>
            </div>
            <Button
              icon={QrCode}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              fullWidth
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate QR'
              )}
            </Button>

            {generated?.code && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border-2 border-[#E0E0E0] bg-background">
                  <div className="text-sm font-semibold text-text-secondary mb-3">Your QR</div>
                  <div className="flex justify-center mb-3">
                    <img
                      src={`/api/qr/image/${generated.code}?format=${format}&size=240`}
                      alt="QR"
                      className="w-[240px] h-[240px] object-contain bg-white p-4 rounded-xl"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => window.open(generated.url, '_blank')}
                      className="text-primary hover:underline font-semibold"
                    >
                      Open hosted link
                    </button>
                    <span className="text-text-secondary">•</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}${generated.url}`.replace(/undefined/g, ''),
                        )
                      }
                      className="text-text-secondary hover:text-text flex items-center gap-1"
                    >
                      <Copy size={14} />
                      Copy link
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-[#E0E0E0] bg-background">
                  <div className="text-sm font-semibold text-text-secondary mb-3">Pay this QR</div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-text mb-2">
                        Phone (STK)
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary mb-2"
                        placeholder="07XXXXXXXX"
                      />
                      <Button
                        icon={Smartphone}
                        onClick={() => payMutation.mutate({ method: 'stk' })}
                        disabled={payMutation.isPending || !phone}
                        fullWidth
                        variant="secondary"
                      >
                        {payMutation.isPending ? 'Processing...' : 'Pay with STK'}
                      </Button>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text mb-2">
                        Wallet No
                      </label>
                      <input
                        value={walletNo}
                        onChange={(e) => setWalletNo(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary mb-2"
                      />
                      <Button
                        icon={Wallet}
                        onClick={() => payMutation.mutate({ method: 'wallet' })}
                        disabled={payMutation.isPending || !walletNo}
                        fullWidth
                        variant="secondary"
                      >
                        {payMutation.isPending ? 'Processing...' : 'Pay with Wallet'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

