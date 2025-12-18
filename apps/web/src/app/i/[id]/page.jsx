"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

function shortId(id) {
  const s = String(id || "");
  return s.length > 6 ? s.slice(-6) : s;
}

export default function HostedInvoicePage(props) {
  const id = props?.params?.id;
  const { data: user } = useUser();
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState(null);

  const {
    data,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("Failed to load invoice");
      return res.json();
    },
  });

  const inv = data?.invoice;
  const items = data?.items || [];
  const isPaid = inv?.status === "paid";
  const isCancelled = inv?.status === "cancelled";

  const stkMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      // If signed-in customer, we could use create-self and pass metadata.invoice_id
      if (user && user.role === "customer") {
        const res = await fetch("/api/payments/lemonade/create-self", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "stk_push",
            payload: {
              amount: inv.total,
              phone_number: phone,
              currency: inv.currency || "KES",
              order_reference: `inv-${inv.id}`,
              description: `Invoice ${inv.id}`,
            },
            metadata: { invoice_id: inv.id },
          }),
        });
        const out = await res.json();
        if (!res.ok || !out?.payment_id) {
          throw new Error(out?.error || "Could not start payment");
        }
        return out;
      }
      // Public wrapper
      const res = await fetch(`/api/invoices/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "stk", phone_number: phone }),
      });
      const out = await res.json();
      if (!res.ok || !out?.payment_id)
        throw new Error(out?.error || "Checkout failed");
      return out;
    },
    onSuccess: (out) => {
      if (typeof window !== "undefined")
        window.location.href = `/pay/success/${out.payment_id}`;
    },
    onError: (e) => setError(e.message),
  });

  const walletMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (user && user.role === "customer") {
        const res = await fetch("/api/payments/lemonade/create-self", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "wallet_payment",
            payload: {
              amount: inv.total,
              wallet_no: wallet,
              currency: inv.currency || "KES",
              order_reference: `inv-${inv.id}`,
              description: `Invoice ${inv.id}`,
            },
            metadata: { invoice_id: inv.id },
          }),
        });
        const out = await res.json();
        if (!res.ok || !out?.payment_id)
          throw new Error(out?.error || "Could not start payment");
        return out;
      }
      const res = await fetch(`/api/invoices/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "wallet", wallet_no: wallet }),
      });
      const out = await res.json();
      if (!res.ok || !out?.payment_id)
        throw new Error(out?.error || "Checkout failed");
      return out;
    },
    onSuccess: (out) => {
      if (typeof window !== "undefined")
        window.location.href = `/pay/success/${out.payment_id}`;
    },
    onError: (e) => setError(e.message),
  });

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (fetchError || !inv) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Invoice #{shortId(inv.id)}</h1>
        {inv.customer_name && (
          <div className="text-slate-700">{inv.customer_name}</div>
        )}
      </div>

      <div className="bg-white border rounded-lg mb-4">
        <div className="p-3 border-b font-medium">Items</div>
        <div className="p-3">
          <div className="flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <div className="text-slate-800">
                  {it.name} <span className="text-slate-500">x{it.qty}</span>
                </div>
                <div className="text-slate-800">
                  {Number(it.line_total).toFixed(2)} {inv.currency}
                </div>
              </div>
            ))}
          </div>
          <div className="h-px bg-slate-200 my-3" />
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="text-slate-800">
              {Number(inv.subtotal).toFixed(2)} {inv.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax</span>
            <span className="text-slate-800">
              {Number(inv.tax).toFixed(2)} {inv.currency}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold mt-2">
            <span>Total</span>
            <span>
              {Number(inv.total).toFixed(2)} {inv.currency}
            </span>
          </div>
        </div>
      </div>

      {isPaid && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 mb-4">
          Paid ·{" "}
          <a href="/merchant/invoices" className="underline">
            View invoices
          </a>
        </div>
      )}
      {isCancelled && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 mb-4">
          Cancelled
        </div>
      )}

      {!isPaid && !isCancelled && (
        <div className="bg-white border rounded-lg p-3">
          <div className="text-sm text-slate-700 mb-3">Pay now</div>
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border rounded p-3">
              <div className="text-sm text-slate-700 mb-2">STK Push</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="border w-full px-3 py-2 rounded mb-2"
              />
              <button
                onClick={() => stkMutation.mutate()}
                disabled={stkMutation.isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-sm"
              >
                {stkMutation.isLoading ? "Starting…" : "Pay with STK"}
              </button>
            </div>
            <div className="border rounded p-3">
              <div className="text-sm text-slate-700 mb-2">Wallet</div>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Wallet number"
                className="border w-full px-3 py-2 rounded mb-2"
              />
              <button
                onClick={() => walletMutation.mutate()}
                disabled={walletMutation.isLoading}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white rounded px-3 py-2 text-sm"
              >
                {walletMutation.isLoading ? "Starting…" : "Pay with Wallet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
