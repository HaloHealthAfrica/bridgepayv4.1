"use client";
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function fetchJSON(url, init) {
  return fetch(url, init).then(async (r) => {
    if (!r.ok) {
      let errText = `${r.status} ${r.statusText}`;
      try {
        const j = await r.json();
        if (j?.error) errText = `${errText} - ${j.error}`;
      } catch {}
      throw new Error(errText);
    }
    return r.json();
  });
}

export default function MerchantShoppingPage() {
  const qc = useQueryClient();
  const [selectedShop, setSelectedShop] = useState(null);
  const [createShopName, setCreateShopName] = useState("");
  const [createProductName, setCreateProductName] = useState("");
  const [createProductPrice, setCreateProductPrice] = useState("");
  const [createOrderQty, setCreateOrderQty] = useState(1);
  const [paymentMode, setPaymentMode] = useState("PAY_NOW");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [error, setError] = useState(null);

  // Shops
  const shopsQ = useQuery({
    queryKey: ["shops"],
    queryFn: () => fetchJSON("/api/shopping/shops").then((d) => d.shops || []),
  });

  const productsQ = useQuery({
    queryKey: ["products", selectedShop],
    enabled: !!selectedShop,
    queryFn: () =>
      fetchJSON(`/api/shopping/products?shopId=${selectedShop}`).then(
        (d) => d.products || [],
      ),
  });

  const createShop = useMutation({
    mutationFn: async () => {
      return fetchJSON("/api/shopping/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createShopName }),
      });
    },
    onSuccess: () => {
      setCreateShopName("");
      qc.invalidateQueries({ queryKey: ["shops"] });
    },
    onError: (e) => setError(e.message),
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      return fetchJSON("/api/shopping/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop,
          name: createProductName,
          price: Number(createProductPrice || 0),
          currency: "KES",
        }),
      });
    },
    onSuccess: () => {
      setCreateProductName("");
      setCreateProductPrice("");
      qc.invalidateQueries({ queryKey: ["products", selectedShop] });
    },
    onError: (e) => setError(e.message),
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!selectedShop || !selectedProduct)
        throw new Error("Pick a shop and product");
      return fetchJSON("/api/shopping/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: selectedShop,
          items: [
            { productId: selectedProduct, qty: Number(createOrderQty || 1) },
          ],
          paymentMode,
          currency: "KES",
        }),
      });
    },
    onSuccess: (d) => {
      setLastOrder(d.order);
    },
    onError: (e) => setError(e.message),
  });

  const payNow = useMutation({
    mutationFn: async (orderId) =>
      fetchJSON(`/api/shopping/orders/${orderId}/pay-now`, { method: "POST" }),
    onSuccess: () => {
      setError(null);
    },
    onError: (e) => setError(e.message),
  });

  const fundEscrow = useMutation({
    mutationFn: async (orderId) =>
      fetchJSON(`/api/shopping/orders/${orderId}/escrow/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseCondition: "delivered" }),
      }),
    onSuccess: () => setError(null),
    onError: (e) => setError(e.message),
  });

  const releaseEscrow = useMutation({
    mutationFn: async (orderId) =>
      fetchJSON(`/api/shopping/orders/${orderId}/escrow/release`, {
        method: "POST",
      }),
    onSuccess: () => setError(null),
    onError: (e) => setError(e.message),
  });

  const shops = shopsQ.data || [];
  const products = productsQ.data || [];

  return (
    <PortalLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Shopping (Add-on)</h1>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Shops */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-600">Create Shop</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="My Shop"
                value={createShopName}
                onChange={(e) => setCreateShopName(e.target.value)}
              />
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!createShopName || createShop.isLoading}
              onClick={() => createShop.mutate()}
            >
              {createShop.isLoading ? "Creating..." : "Create"}
            </button>
          </div>

          <div className="mt-4">
            <label className="text-sm text-gray-600">Select Shop</label>
            <select
              className="mt-1 w-full border rounded px-3 py-2"
              value={selectedShop || ""}
              onChange={(e) => setSelectedShop(e.target.value || null)}
            >
              <option value="">-- pick --</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-600">Create Product</label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                placeholder="Product name"
                value={createProductName}
                onChange={(e) => setCreateProductName(e.target.value)}
                disabled={!selectedShop}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Price (KES)</label>
              <input
                type="number"
                className="mt-1 w-[140px] border rounded px-3 py-2"
                value={createProductPrice}
                onChange={(e) => setCreateProductPrice(e.target.value)}
                disabled={!selectedShop}
              />
            </div>
            <button
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={
                !selectedShop ||
                !createProductName ||
                !createProductPrice ||
                createProduct.isLoading
              }
              onClick={() => createProduct.mutate()}
            >
              {createProduct.isLoading ? "Saving..." : "Add"}
            </button>
          </div>

          {selectedShop && (
            <div className="mt-4">
              <label className="text-sm text-gray-600">Select Product</label>
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={selectedProduct || ""}
                onChange={(e) => setSelectedProduct(e.target.value || null)}
              >
                <option value="">-- pick --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — KES {Number(p.price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Orders */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-gray-600">Qty</label>
              <input
                type="number"
                className="mt-1 w-full border rounded px-3 py-2"
                min={1}
                value={createOrderQty}
                onChange={(e) => setCreateOrderQty(Number(e.target.value || 1))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">Payment Mode</label>
              <select
                className="mt-1 w-full border rounded px-3 py-2"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="PAY_NOW">Pay Now</option>
                <option value="ESCROW">Escrow</option>
                <option value="INSTALLMENT_PAY_AFTER">
                  Installment (deliver after paid)
                </option>
                <option value="DELIVER_THEN_COLLECT">
                  Deliver then collect
                </option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50 w-full"
                disabled={
                  !selectedShop || !selectedProduct || createOrder.isLoading
                }
                onClick={() => createOrder.mutate()}
              >
                {createOrder.isLoading ? "Creating..." : "Create Order"}
              </button>
            </div>
          </div>

          {lastOrder && (
            <div className="mt-4 p-3 border rounded bg-gray-50">
              <div className="text-sm text-gray-700">Order #{lastOrder.id}</div>
              <div className="text-sm text-gray-600">
                Mode: {lastOrder.payment_mode} | Amount: KES{" "}
                {Number(lastOrder.total_amount).toFixed(2)}
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {lastOrder.payment_mode === "PAY_NOW" && (
                  <button
                    className="bg-black text-white px-3 py-2 rounded disabled:opacity-50"
                    disabled={payNow.isLoading}
                    onClick={() => payNow.mutate(lastOrder.id)}
                  >
                    {payNow.isLoading ? "Paying..." : "Pay Now"}
                  </button>
                )}
                {lastOrder.payment_mode === "ESCROW" && (
                  <>
                    <button
                      className="bg-black text-white px-3 py-2 rounded disabled:opacity-50"
                      disabled={fundEscrow.isLoading}
                      onClick={() => fundEscrow.mutate(lastOrder.id)}
                    >
                      {fundEscrow.isLoading ? "Funding..." : "Fund Escrow"}
                    </button>
                    <button
                      className="bg-white border px-3 py-2 rounded disabled:opacity-50"
                      disabled={releaseEscrow.isLoading}
                      onClick={() => releaseEscrow.mutate(lastOrder.id)}
                    >
                      {releaseEscrow.isLoading
                        ? "Releasing..."
                        : "Release Escrow (merchant)"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
