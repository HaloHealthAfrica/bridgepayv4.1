"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function useRefunds({ status }) {
  return useQuery({
    queryKey: ["refunds", { status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "50");
      const res = await fetch(`/api/merchant/refunds?${params.toString()}`);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) throw new Error(json?.error || `Failed: ${res.status}`);
      return json?.refunds || [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

function useCreateRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => {
      const res = await fetch("/api/merchant/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(json?.error || `Refund failed: ${res.status}`);
        err.response = json;
        throw err;
      }
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["refunds"] });
    },
    retry: false,
  });
}

export default function MerchantRefundsPage() {
  const [status, setStatus] = useState("");
  const {
    data: refunds = [],
    isLoading,
    error,
  } = useRefunds({ status: status || undefined });
  const createRefund = useCreateRefund();

  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState(null);

  const onSubmit = async () => {
    setResult(null);
    const amt = Number(amount);
    const errs = [];
    if (!paymentId) errs.push("Payment ID is required");
    if (!amt || amt <= 0) errs.push("Amount must be > 0");
    if (errs.length) {
      alert(errs.join("\n"));
      return;
    }
    try {
      const body = {
        payment_id: Number(paymentId),
        amount: amt,
        reason: reason || undefined,
      };
      const res = await createRefund.mutateAsync(body);
      setResult(res);
    } catch (e) {
      console.error(e);
      setResult(e.response || { ok: false, error: e.message });
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Refunds</h1>
        <div className="flex gap-2 items-center">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="succeeded">succeeded</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 text-sm font-medium text-slate-700">
              Latest
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-slate-500 text-sm">Loading…</div>
              ) : error ? (
                <div className="text-red-600 text-sm">
                  {String(error.message || error)}
                </div>
              ) : refunds.length === 0 ? (
                <div className="text-slate-500 text-sm">No refunds yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-600">
                      <tr>
                        <th className="py-2 pr-2">Refund</th>
                        <th className="py-2 pr-2">Payment</th>
                        <th className="py-2 pr-2">Amount</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2 pr-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refunds.map((r) => (
                        <tr key={r.id} className="border-t border-slate-100">
                          <td className="py-2 pr-2 font-mono text-xs break-all">
                            {r.id}
                          </td>
                          <td className="py-2 pr-2">#{r.payment_id}</td>
                          <td className="py-2 pr-2">
                            {r.amount} {r.currency}
                          </td>
                          <td className="py-2 pr-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${r.status === "succeeded" ? "bg-green-100 text-green-800" : r.status === "failed" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-800"}`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 pr-2 text-slate-500">
                            {new Date(r.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-700 mb-3">
              New refund
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Payment ID
                </label>
                <input
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 123"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  Reason (optional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Customer request"
                />
              </div>
              <button
                onClick={onSubmit}
                disabled={createRefund.isLoading}
                className="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              >
                {createRefund.isLoading ? "Processing…" : "Create refund"}
              </button>
            </div>
            {result && (
              <div className="mt-4 bg-slate-50 rounded p-2 overflow-x-auto">
                <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
