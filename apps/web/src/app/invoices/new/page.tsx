import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { CurrencySelector } from '@/components/CurrencySelector';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  description?: string;
}

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [customer_name, setCustomerName] = useState('');
  const [customer_email, setCustomerEmail] = useState('');
  const [customer_phone, setCustomerPhone] = useState('');
  const [due_date, setDueDate] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [items, setItems] = useState<InvoiceItem[]>([{ name: 'Item', qty: 1, price: 0 }]);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (acc, it) => acc + Number(it.qty || 0) * Number(it.price || 0),
      0
    );
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email,
          customer_phone,
          customer_name,
          due_date: due_date || null,
          items,
          currency,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['invoices-list'] });
      toast.success('Invoice created successfully!');
      if (data?.id) {
        navigate(`/merchant/invoices/${data.id}`);
      }
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to create invoice');
    },
  });

  const role = session?.user?.role;
  const allowed = role === 'admin' || role === 'merchant';

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">New Invoice</h1>
          <p className="text-text-secondary mb-4">
            You need to sign in as a merchant or admin.
          </p>
          <Button onClick={() => navigate('/account/signin')}>Sign In</Button>
        </div>
      </div>
    );
  }

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { name: 'Item', qty: 1, price: 0 }]);

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/merchant/invoices')}
            className="mb-4"
          >
            Back to Invoices
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create Invoice</h1>
          <p className="text-text-secondary">Generate a new invoice for your customer</p>
        </div>

        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-6 text-error">
            {error}
          </div>
        )}

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
          <h2 className="text-lg font-bold mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={customer_name}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Customer Email *
              </label>
              <input
                type="email"
                value={customer_email}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Customer Phone
              </label>
              <input
                type="tel"
                value={customer_phone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={due_date}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Currency *
              </label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Items</h2>
            <Button variant="secondary" icon={Plus} onClick={addItem}>
              Add Item
            </Button>
          </div>
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-background rounded-xl"
              >
                <input
                  value={it.name}
                  onChange={(e) => updateItem(idx, { name: e.target.value })}
                  placeholder="Item name"
                  className="md:col-span-4 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={it.qty}
                  onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                  placeholder="Qty"
                  min="0"
                  className="md:col-span-2 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
                <input
                  type="number"
                  value={it.price}
                  onChange={(e) => updateItem(idx, { price: Number(e.target.value) })}
                  placeholder="Price"
                  min="0"
                  step="0.01"
                  className="md:col-span-2 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
                <input
                  value={it.description || ''}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="md:col-span-3 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
                <div className="md:col-span-1 flex items-center justify-between">
                  <div className="text-sm font-semibold text-primary">
                    {formatCurrency(Number(it.qty || 0) * Number(it.price || 0), currency)}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-2 text-error hover:bg-[#FFEBEE] rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex justify-end">
            <div className="w-full md:w-80 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Subtotal</span>
                <span className="font-semibold">
                  {formatCurrency(totals.subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tax</span>
                <span className="font-semibold">
                  {formatCurrency(totals.tax, currency)}
                </span>
              </div>
              <div className="h-px bg-[#E0E0E0] my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(totals.total, currency)}</span>
              </div>
              <Button
                fullWidth
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Save & Get Link'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

