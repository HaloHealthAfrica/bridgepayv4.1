"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout"; // add header + side menu

export default function AdminBillingCatalogPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["billing-fees"],
    queryFn: async () => {
      const res = await fetch("/api/billing/fees");
      if (!res.ok)
        throw new Error(
          `When fetching /api/billing/fees, the response was [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const fees = data?.fees || [];

  const [form, setForm] = useState({
    code: "",
    name: "",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "merchant",
    rate: 0.02,
    amount: "",
    status: "active",
  });

  const createFee = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch("/api/billing/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok)
        throw new Error(
          `When posting /api/billing/fees, the response was [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-fees"] }),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/fees/seed", { method: "POST" });
      if (!res.ok)
        throw new Error(
          `When posting /api/billing/fees/seed, the response was [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-fees"] }),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.fee_type === "percentage") payload.amount = null;
    if (payload.fee_type === "flat") payload.rate = null;
    createFee.mutate(payload);
  };

  return (
    <PortalLayout>
      <div className="">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Billing – Fee Catalog</h1>
            <p className="text-gray-500">Create and manage fee rules</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="px-3 py-2 border rounded-md text-sm">
              Back to Admin
            </a>
            <button
              onClick={() => seedDefaults.mutate()}
              disabled={seedDefaults.isLoading}
              className="px-4 py-2 rounded border"
            >
              {seedDefaults.isLoading ? "Seeding…" : "Seed defaults"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-4 bg-white">
            <h2 className="font-semibold mb-3">Add / Update Fee</h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border rounded px-3 py-2"
                  value={form.fee_type}
                  onChange={(e) =>
                    setForm({ ...form, fee_type: e.target.value })
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="flat">Flat</option>
                  <option value="tiered">Tiered</option>
                </select>
                <select
                  className="border rounded px-3 py-2"
                  value={form.applies_to}
                  onChange={(e) =>
                    setForm({ ...form, applies_to: e.target.value })
                  }
                >
                  <option>TOPUP</option>
                  <option>WITHDRAWAL</option>
                  <option>MERCHANT_PAYMENT</option>
                  <option>SPLIT</option>
                  <option>PROJECT</option>
                  <option>SCHEDULED</option>
                  <option>FX</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border rounded px-3 py-2"
                  value={form.payer}
                  onChange={(e) => setForm({ ...form, payer: e.target.value })}
                >
                  <option>merchant</option>
                  <option>customer</option>
                  <option>platform</option>
                </select>
                {form.fee_type === "percentage" ? (
                  <input
                    className="border rounded px-3 py-2"
                    type="number"
                    step="0.0001"
                    placeholder="Rate (e.g. 0.02)"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  />
                ) : (
                  <input
                    className="border rounded px-3 py-2"
                    type="number"
                    step="0.01"
                    placeholder="Flat Amount"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                )}
              </div>
              <button
                type="submit"
                className="bg-[#2563EB] text-white px-4 py-2 rounded"
                disabled={createFee.isLoading}
              >
                {createFee.isLoading ? "Saving..." : "Save Fee"}
              </button>
              {createFee.error && (
                <p className="text-red-600 text-sm">
                  {String(createFee.error.message || createFee.error)}
                </p>
              )}
            </form>
          </div>

          <div className="border rounded-lg p-4 bg-white overflow-auto">
            <h2 className="font-semibold mb-3">Active Fees</h2>
            {isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : error ? (
              <p className="text-red-600">Could not load fees</p>
            ) : fees.length === 0 ? (
              <p className="text-gray-500">No fees yet</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2 pr-2">Code</th>
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Scope</th>
                    <th className="py-2 pr-2">Payer</th>
                    <th className="py-2 pr-2">Value</th>
                    <th className="py-2 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="py-2 pr-2 font-medium">{f.code}</td>
                      <td className="py-2 pr-2">{f.name}</td>
                      <td className="py-2 pr-2">{f.fee_type}</td>
                      <td className="py-2 pr-2">{f.applies_to}</td>
                      <td className="py-2 pr-2">{f.payer}</td>
                      <td className="py-2 pr-2">
                        {f.fee_type === "percentage" ? `${f.rate}` : f.amount}
                      </td>
                      <td className="py-2 pr-2">{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
