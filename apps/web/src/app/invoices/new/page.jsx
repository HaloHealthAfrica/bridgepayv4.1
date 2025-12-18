"use client";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

export default function NewInvoicePage() {
  const { data: user, loading } = useUser();
  const qc = useQueryClient();

  const [customer_name, setCustomerName] = useState("");
  const [customer_email, setCustomerEmail] = useState("");
  const [customer_phone, setCustomerPhone] = useState("");
  const [due_date, setDueDate] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [items, setItems] = useState([{ name: "Item", qty: 1, price: 0 }]);
  const [error, setError] = useState(null);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (acc, it) => acc + Number(it.qty || 0) * Number(it.price || 0),
      0,
    );
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [items]);

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      qc.invalidateQueries({ queryKey: ["invoices-list"] });
      if (data?.id && typeof window !== "undefined") {
        window.location.href = `/merchant/invoices/${data.id}`;
      }
    },
    onError: (e) => setError(e.message),
  });

  if (loading) return <div className="p-6">Loading...</div>;
  const role = user?.role;
  const allowed = role === "admin" || role === "merchant";
  if (!allowed) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">New Invoice</h1>
        <p className="text-slate-600">
          You need to sign in as a merchant or admin.
        </p>
        <a className="text-blue-600 underline" href="/account/signin">
          Sign in
        </a>
      </div>
    );
  }

  const updateItem = (idx, patch) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  };
  const addItem = () =>
    setItems((prev) => [...prev, { name: "Item", qty: 1, price: 0 }]);
  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create Invoice</h1>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          value={customer_name}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Customer name"
          className="border px-3 py-2 rounded"
        />
        <input
          value={customer_email}
          onChange={(e) => setCustomerEmail(e.target.value)}
          placeholder="Customer email"
          className="border px-3 py-2 rounded"
        />
        <input
          value={customer_phone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="Customer phone"
          className="border px-3 py-2 rounded"
        />
        <input
          value={due_date}
          onChange={(e) => setDueDate(e.target.value)}
          type="date"
          className="border px-3 py-2 rounded"
        />
      </div>

      <div className="mb-2 flex items-center gap-3">
        <span className="text-sm text-slate-600">Currency</span>
        <CurrencySelector value={currency} onChange={setCurrency} />
      </div>

      <div className="bg-white border rounded-lg">
        <div className="p-3 border-b font-medium">Items</div>
        <div className="p-3 flex flex-col gap-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                placeholder="Name"
                className="border px-3 py-2 rounded md:col-span-2"
              />
              <input
                type="number"
                value={it.qty}
                onChange={(e) =>
                  updateItem(idx, { qty: Number(e.target.value) })
                }
                placeholder="Qty"
                className="border px-3 py-2 rounded"
              />
              <input
                type="number"
                value={it.price}
                onChange={(e) =>
                  updateItem(idx, { price: Number(e.target.value) })
                }
                placeholder="Price"
                className="border px-3 py-2 rounded"
              />
              <input
                value={it.description || ""}
                onChange={(e) =>
                  updateItem(idx, { description: e.target.value })
                }
                placeholder="Description (optional)"
                className="border px-3 py-2 rounded md:col-span-2"
              />
              <div className="text-sm text-slate-600">
                Line: {(Number(it.qty || 0) * Number(it.price || 0)).toFixed(2)}
              </div>
              <button
                onClick={() => removeItem(idx)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button onClick={addItem} className="text-blue-600 text-sm">
            + Add item
          </button>
        </div>
      </div>

      <div className="flex justify-end mt-4 text-sm text-slate-700">
        <div className="w-full md:w-[320px] border rounded-lg p-3 bg-white">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>
              {totals.subtotal.toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>
              {totals.tax.toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900 mt-2">
            <span>Total</span>
            <span>
              {totals.total.toFixed(2)} {currency}
            </span>
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isLoading}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2"
          >
            {createMutation.isLoading ? "Saving..." : "Save & Get Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
