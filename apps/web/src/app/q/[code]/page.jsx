"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

function Masked({ value }) {
  const v = String(value || "");
  if (!v) return null;
  const masked =
    v.length > 4 ? `${"*".repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : v;
  return <span>{masked}</span>;
}

export default function HostedQRPage({ params: { code } }) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["qr", code],
    queryFn: async () => {
      const res = await fetch(`/api/qr/${code}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load QR ${code}`);
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState("11391837");
  const [lastPaymentId, setLastPaymentId] = useState(null);
  const [errMsg, setErrMsg] = useState(null);

  const payMutation = useMutation({
    mutationFn: async ({ method }) => {
      const res = await fetch(`/api/qr/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          method,
          phone_number: method === "stk" ? phone : undefined,
          wallet_no: method === "wallet" ? wallet : undefined,
        }),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const e = new Error(json?.error || `Pay failed: ${res.status}`);
        e.response = json || text;
        throw e;
      }
      return json;
    },
    onSuccess: (json) => {
      setErrMsg(null);
      const pid = json?.payment_id;
      setLastPaymentId(pid || null);
      if (pid && typeof window !== "undefined") {
        window.location.href = `/pay/success/${pid}`;
      }
    },
    onError: (e) => {
      console.error("qr.pay error", e);
      const details = e?.response?.details;
      const detailMsg = Array.isArray(details) ? details.join(", ") : undefined;
      setErrMsg(detailMsg || e.message || "Payment failed");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!lastPaymentId) return { ok: false, error: "no_payment" };
      const res = await fetch(`/api/payments/lemonade/status-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: Number(lastPaymentId) }),
      });
      const json = await res.json().catch(() => ({}));
      return json;
    },
  });

  const statusPill = useMemo(() => {
    const s = data?.status;
    if (s === "active")
      return (
        <span className="px-2 py-1 text-xs rounded bg-emerald-50 text-emerald-700">
          Active
        </span>
      );
    if (s === "expired")
      return (
        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
          Expired
        </span>
      );
    if (s === "used")
      return (
        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
          Used
        </span>
      );
    if (s === "disabled")
      return (
        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
          Disabled
        </span>
      );
    return null;
  }, [data?.status]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-slate-600">Loading QR…</div>
      </div>
    );
  }
  if (error || !data?.ok) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">QR not found</h1>
        <p className="text-slate-600">This code may be invalid or removed.</p>
      </div>
    );
  }

  const canPay = data.status === "active";

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">QR Payment</h1>
        {statusPill}
      </div>

      <div className="bg-white border rounded-xl p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-slate-700">Code</div>
            <div className="font-mono text-slate-900">{code}</div>
          </div>
          <div>
            <div className="text-slate-700">Amount</div>
            <div className="text-slate-900 font-medium">
              {data.amount} {data.currency || "KES"}
            </div>
          </div>
        </div>
      </div>

      {canPay ? (
        <div className="bg-white border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-700 mb-1">
                Phone (for STK)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full border rounded-lg px-3 py-2"
              />
              <button
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                disabled={!phone || payMutation.isLoading}
                onClick={() => payMutation.mutate({ method: "stk" })}
              >
                {payMutation.isLoading ? "Processing…" : "Pay with STK Push"}
              </button>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">
                Wallet No
              </label>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
              <button
                className="mt-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
                disabled={!wallet || payMutation.isLoading}
                onClick={() => payMutation.mutate({ method: "wallet" })}
              >
                {payMutation.isLoading ? "Processing…" : "Pay with Wallet"}
              </button>
            </div>
          </div>
          {errMsg && <div className="mt-3 text-sm text-red-600">{errMsg}</div>}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-4 mb-4 text-slate-600">
          Payments are not available for this QR.
        </div>
      )}

      {lastPaymentId && (
        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-slate-700">
              Last payment attempt:{" "}
              <span className="font-mono">{lastPaymentId}</span>
            </div>
            <button
              onClick={() => statusMutation.mutate()}
              className="bg-slate-100 text-slate-800 px-3 py-1 rounded hover:bg-slate-200"
            >
              Check status
            </button>
          </div>
          {statusMutation.data && (
            <pre className="mt-3 text-xs bg-slate-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(statusMutation.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
