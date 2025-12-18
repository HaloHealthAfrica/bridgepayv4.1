"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

function formatCurrency(value, currency = "KES") {
  if (value == null || isNaN(Number(value))) return "—";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch (e) {
    return `${Number(value).toFixed(2)} ${currency}`;
  }
}

export default function ScheduledPaymentsPage() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(2);
  const [cadence, setCadence] = useState("weekly");
  const [method, setMethod] = useState("stk"); // stk | wallet
  const [payee, setPayee] = useState(""); // phone or wallet
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const schedulesQuery = useQuery({
    queryKey: ["scheduled", { status: statusFilter }],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/payments/scheduled?status=${encodeURIComponent(statusFilter)}`
        : "/api/payments/scheduled";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (body) => {
      const res = await fetch("/api/payments/scheduled", {
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
        const err = new Error(`Create failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    onSuccess: () => {
      setMessage("Scheduled payment created");
      setError(null);
      qc.invalidateQueries({ queryKey: ["scheduled"] });
    },
    onError: (e) => {
      console.error(e);
      setError(e?.response?.error || e.message);
      setMessage(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }) => {
      const res = await fetch(`/api/payments/scheduled/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled"] }),
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/scheduled/run`, {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Run failed: ${res.status}`);
      return json;
    },
  });

  const onCreate = () => {
    setError(null);
    setMessage(null);
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!payee.trim()) {
      setError(
        method === "stk"
          ? "Phone number is required"
          : "Wallet number is required",
      );
      return;
    }

    const metadata =
      method === "stk"
        ? { method: "stk", phone_number: payee }
        : { method: "wallet", wallet_no: payee };
    createMutation.mutate({
      amount: Number(amount),
      cadence,
      currency: "KES",
      payee,
      metadata,
    });
  };

  const items = useMemo(
    () => schedulesQuery.data?.items || [],
    [schedulesQuery.data],
  );

  return (
    <PortalLayout>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Scheduled Payments
            </h1>
            <p className="text-slate-500">
              Create and manage your recurring payments
            </p>
          </div>
          <nav className="hidden md:block text-sm text-slate-500">
            <span className="text-slate-400">Payments</span>
            <span className="mx-2">/</span>
            <span className="text-slate-900">Scheduled</span>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm">{String(error)}</div>
      )}
      {message && (
        <div className="mb-4 text-green-600 text-sm">{String(message)}</div>
      )}

      {/* Create form card */}
      <div className="card p-4 md:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="stk">STK Push</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {method === "stk" ? "Phone number" : "Wallet number"}
            </label>
            <input
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCreate}
            disabled={createMutation.isLoading}
            className="btn-primary px-4 py-2 rounded-lg"
          >
            {createMutation.isLoading ? "Creating…" : "Create schedule"}
          </button>
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isLoading}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg"
          >
            {runMutation.isLoading ? "Running…" : "Run due now (admin)"}
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-slate-600 border-b bg-slate-50">
          <div className="col-span-3">Next run</div>
          <div className="col-span-3">Amount</div>
          <div className="col-span-2">Cadence</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {schedulesQuery.isLoading ? (
          <div className="p-4 text-sm text-slate-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 mb-3" />
            <div className="font-medium text-slate-900 mb-1">
              No schedules yet
            </div>
            <div className="text-slate-500">
              Create your first scheduled payment using the form above.
            </div>
          </div>
        ) : (
          items.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-t text-sm items-center hover:bg-slate-50"
            >
              <div className="col-span-3">
                {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}
              </div>
              <div className="col-span-3 font-semibold text-right md:text-left md:font-normal md:text-slate-900">
                <span className="md:hidden">
                  {formatCurrency(s.amount, s.currency)}
                </span>
                <span className="hidden md:inline">
                  {formatCurrency(s.amount, s.currency)}
                </span>
              </div>
              <div className="col-span-2 capitalize">{s.cadence || "—"}</div>
              <div className="col-span-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${s.status === "active" ? "bg-green-100 text-green-700" : s.status === "paused" ? "bg-yellow-100 text-yellow-700" : s.status === "failed" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}
                >
                  {s.status || "—"}
                </span>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                {s.status !== "active" && (
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: s.id,
                        patch: { status: "active" },
                      })
                    }
                    className="px-3 py-1 rounded border"
                  >
                    Activate
                  </button>
                )}
                {s.status === "active" && (
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: s.id,
                        patch: { status: "paused" },
                      })
                    }
                    className="px-3 py-1 rounded border"
                  >
                    Pause
                  </button>
                )}
                {s.status !== "cancelled" && (
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        id: s.id,
                        patch: { status: "cancelled" },
                      })
                    }
                    className="px-3 py-1 rounded border"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
