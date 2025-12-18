import React, { useState } from 'react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingBag, Package, CreditCard, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatCurrency';

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  // API returns { ok: true, ... } format
  if (data.ok === false) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

function MerchantShoppingContent() {
  const qc = useQueryClient();
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [createShopName, setCreateShopName] = useState('');
  const [createProductName, setCreateProductName] = useState('');
  const [createProductPrice, setCreateProductPrice] = useState('');
  const [createOrderQty, setCreateOrderQty] = useState(1);
  const [paymentMode, setPaymentMode] = useState('PAY_NOW');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Shops
  const shopsQ = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const res = await fetch('/api/shopping/shops');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch shops');
      }
      const data = await res.json();
      // API returns { ok: true, shops } or { shops } format
      if (data.ok === false) {
        throw new Error(data.message || 'Failed to fetch shops');
      }
      return data.shops || [];
    },
  });

  const productsQ = useQuery({
    queryKey: ['products', selectedShop],
    enabled: !!selectedShop,
    queryFn: async () => {
      const res = await fetch(`/api/shopping/products?shopId=${selectedShop}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch products');
      }
      const data = await res.json();
      // API returns { ok: true, products } or { products } format
      if (data.ok === false) {
        throw new Error(data.message || 'Failed to fetch products');
      }
      return data.products || [];
    },
  });

  const createShop = useMutation({
    mutationFn: async () => {
      return fetchJSON('/api/shopping/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createShopName }),
      });
    },
    onSuccess: () => {
      setCreateShopName('');
      qc.invalidateQueries({ queryKey: ['shops'] });
      toast.success('Shop created');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to create shop');
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      return fetchJSON('/api/shopping/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShop,
          name: createProductName,
          price: Number(createProductPrice || 0),
          currency: 'KES',
        }),
      });
    },
    onSuccess: () => {
      setCreateProductName('');
      setCreateProductPrice('');
      qc.invalidateQueries({ queryKey: ['products', selectedShop] });
      toast.success('Product created');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to create product');
    },
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!selectedShop || !selectedProduct)
        throw new Error('Pick a shop and product');
      return fetchJSON('/api/shopping/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: selectedShop,
          items: [
            { productId: selectedProduct, qty: Number(createOrderQty || 1) },
          ],
          paymentMode,
          currency: 'KES',
        }),
      });
    },
    onSuccess: (d) => {
      setLastOrder(d.order);
      toast.success('Order created');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to create order');
    },
  });

  const payNow = useMutation({
    mutationFn: async (orderId: number) =>
      fetchJSON(`/api/shopping/orders/${orderId}/pay-now`, { method: 'POST' }),
    onSuccess: () => {
      setError(null);
      toast.success('Payment initiated');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Payment failed');
    },
  });

  const fundEscrow = useMutation({
    mutationFn: async (orderId: number) =>
      fetchJSON(`/api/shopping/orders/${orderId}/escrow/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseCondition: 'delivered' }),
      }),
    onSuccess: () => {
      setError(null);
      toast.success('Escrow funded');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to fund escrow');
    },
  });

  const releaseEscrow = useMutation({
    mutationFn: async (orderId: number) =>
      fetchJSON(`/api/shopping/orders/${orderId}/escrow/release`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setError(null);
      toast.success('Escrow released');
    },
    onError: (e: any) => {
      setError(e.message);
      toast.error(e.message || 'Failed to release escrow');
    },
  });

  const shops = shopsQ.data || [];
  const products = productsQ.data || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Shopping (Add-on)</h1>
          <p className="text-text-secondary">Manage shops, products, and orders</p>
        </div>

        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-6 text-error">
            {error}
          </div>
        )}

        {/* Shops Section */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ShoppingBag size={20} />
            Shops
          </h2>
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-text mb-2">Create Shop</label>
              <input
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                placeholder="My Shop"
                value={createShopName}
                onChange={(e) => setCreateShopName(e.target.value)}
              />
            </div>
            <Button
              icon={Plus}
              onClick={() => createShop.mutate()}
              disabled={!createShopName || createShop.isPending}
            >
              {createShop.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">Select Shop</label>
            <select
              className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              value={selectedShop || ''}
              onChange={(e) => setSelectedShop(e.target.value || null)}
            >
              <option value="">-- pick --</option>
              {shops.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Package size={20} />
            Products
          </h2>
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-text mb-2">Create Product</label>
              <input
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary disabled:bg-background"
                placeholder="Product name"
                value={createProductName}
                onChange={(e) => setCreateProductName(e.target.value)}
                disabled={!selectedShop}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Price (KES)</label>
              <input
                type="number"
                className="w-[140px] px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary disabled:bg-background"
                value={createProductPrice}
                onChange={(e) => setCreateProductPrice(e.target.value)}
                disabled={!selectedShop}
                min="0"
                step="0.01"
              />
            </div>
            <Button
              icon={Plus}
              onClick={() => createProduct.mutate()}
              disabled={
                !selectedShop ||
                !createProductName ||
                !createProductPrice ||
                createProduct.isPending
              }
            >
              {createProduct.isPending ? 'Saving...' : 'Add'}
            </Button>
          </div>

          {selectedShop && (
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Select Product</label>
              <select
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                value={selectedProduct || ''}
                onChange={(e) => setSelectedProduct(e.target.value || null)}
              >
                <option value="">-- pick --</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price || 0, 'KES')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Orders Section */}
        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CreditCard size={20} />
            Orders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Quantity</label>
              <input
                type="number"
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                min={1}
                value={createOrderQty}
                onChange={(e) => setCreateOrderQty(Number(e.target.value || 1))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-text mb-2">Payment Mode</label>
              <select
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="PAY_NOW">Pay Now</option>
                <option value="ESCROW">Escrow</option>
                <option value="INSTALLMENT_PAY_AFTER">
                  Installment (deliver after paid)
                </option>
                <option value="DELIVER_THEN_COLLECT">Deliver then collect</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => createOrder.mutate()}
                disabled={!selectedShop || !selectedProduct || createOrder.isPending}
                fullWidth
              >
                {createOrder.isPending ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>

          {lastOrder && (
            <div className="mt-4 p-4 bg-background rounded-xl border border-[#E0E0E0]">
              <div className="font-semibold mb-2">Order #{lastOrder.id}</div>
              <div className="text-sm text-text-secondary mb-3">
                Mode: {lastOrder.payment_mode} | Amount:{' '}
                {formatCurrency(lastOrder.total_amount || 0, 'KES')}
              </div>
              <div className="flex gap-2 flex-wrap">
                {lastOrder.payment_mode === 'PAY_NOW' && (
                  <Button
                    icon={CreditCard}
                    onClick={() => payNow.mutate(lastOrder.id)}
                    disabled={payNow.isPending}
                    variant="secondary"
                  >
                    {payNow.isPending ? 'Paying...' : 'Pay Now'}
                  </Button>
                )}
                {lastOrder.payment_mode === 'ESCROW' && (
                  <>
                    <Button
                      icon={Lock}
                      onClick={() => fundEscrow.mutate(lastOrder.id)}
                      disabled={fundEscrow.isPending}
                      variant="secondary"
                    >
                      {fundEscrow.isPending ? 'Funding...' : 'Fund Escrow'}
                    </Button>
                    <Button
                      icon={Unlock}
                      onClick={() => releaseEscrow.mutate(lastOrder.id)}
                      disabled={releaseEscrow.isPending}
                      variant="secondary"
                    >
                      {releaseEscrow.isPending
                        ? 'Releasing...'
                        : 'Release Escrow (merchant)'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantShoppingPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.MERCHANT}>
      <MerchantShoppingContent />
    </ProtectedRoute>
  );
}

