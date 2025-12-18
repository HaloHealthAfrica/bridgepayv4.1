"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

function MemberRow({ idx, member, onChange, splitType }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
      <div className="md:col-span-2">
        <input
          placeholder="Payee (phone or wallet)"
          value={member.payee}
          onChange={(e) => onChange(idx, { ...member, payee: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="md:col-span-1">
        <select
          value={member.method}
          onChange={(e) => onChange(idx, { ...member, method: e.target.value })}
          className="w-full border rounded px-3 py-2"
        >
          <option value="stk">STK</option>
          <option value="wallet">Wallet</option>
        </select>
      </div>
      <div className="md:col-span-1">
        <input
          type="number"
          disabled={splitType === "equal"}
          placeholder={splitType === "equal" ? "auto" : "Amount"}
          value={member.amount}
          onChange={(e) => onChange(idx, { ...member, amount: e.target.value })}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="md:col-span-1 text-right">
        <span className="text-slate-500 text-xs">Member {idx + 1}</span>
      </div>
    </div>
  );
}

export default function SplitPaymentsPage() {
  const [step, setStep] = useState(1);
  const [splitType, setSplitType] = useState("equal");
  const [total, setTotal] = useState(6);
  const [currency, setCurrency] = useState("KES");
  const [members, setMembers] = useState([
    { payee: "", method: "stk", amount: "" },
    { payee: "", method: "stk", amount: "" },
    { payee: "", method: "stk", amount: "" },
  ]);
  const [createdGroup, setCreatedGroup] = useState(null);
  const [execResult, setExecResult] = useState(null);
  const [error, setError] = useState(null);

  const onChangeMember = (idx, next) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? next : m)));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!total || Number(total) <= 0) throw new Error("Total must be > 0");
      const apiMembers = members.map((m) => ({
        payee: m.payee,
        amount: splitType === "equal" ? undefined : Number(m.amount || 0),
        metadata:
          m.method === "stk"
            ? { method: "stk", phone_number: m.payee }
            : { method: "wallet", wallet_no: m.payee },
      }));
      const res = await fetch("/api/payments/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          split_type: splitType,
          total_amount: Number(total),
          currency,
          members: apiMembers,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || `Create failed: ${res.status}`);
      return json;
    },
    onSuccess: (data) => {
      setCreatedGroup(data.group_id);
      setError(null);
      setStep(3);
    },
    onError: (e) => setError(e.message),
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/split/${createdGroup}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || `Execute failed: ${res.status}`);
      return json;
    },
    onSuccess: setExecResult,
    onError: (e) => setError(e.message),
  });

  const detailsQuery = useQuery({
    queryKey: ["split", createdGroup],
    queryFn: async () => {
      const res = await fetch(`/api/payments/split/${createdGroup}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || `Fetch failed: ${res.status}`);
      return json;
    },
    enabled: !!createdGroup,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Split Payments</h1>
      {error && (
        <div className="mb-3 text-red-600 text-sm">{String(error)}</div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="equal">Equal</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total</label>
              <input
                type="number"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <CurrencySelector value={currency} onChange={setCurrency} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(2)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Members</h2>
            <button
              onClick={() =>
                setMembers((m) => [
                  ...m,
                  { payee: "", method: "stk", amount: "" },
                ])
              }
              className="px-3 py-1 border rounded"
            >
              Add member
            </button>
          </div>
          <div className="space-y-3">
            {members.map((m, i) => (
              <MemberRow
                key={i}
                idx={i}
                member={m}
                onChange={onChangeMember}
                splitType={splitType}
              />
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded border"
            >
              Back
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {createMutation.isLoading ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <h2 className="text-lg font-semibold mb-2">Group created</h2>
          <div className="text-sm mb-4">
            Group ID:{" "}
            <code className="bg-slate-100 px-2 py-1 rounded">
              {createdGroup}
            </code>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => executeMutation.mutate()}
              disabled={executeMutation.isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              {executeMutation.isLoading ? "Starting…" : "Collect now"}
            </button>
            <button
              onClick={() => detailsQuery.refetch()}
              className="px-4 py-2 rounded border"
            >
              Refresh status
            </button>
          </div>

          {execResult && (
            <div className="mt-4 text-sm">
              <div>Completed: {execResult.completed}</div>
              <div>Pending: {execResult.pending}</div>
              <div>Failed: {execResult.failed}</div>
            </div>
          )}

          {detailsQuery.data && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Members</h3>
              <div className="space-y-2">
                {detailsQuery.data.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border rounded px-3 py-2 text-sm"
                  >
                    <div>
                      <div>
                        Status: <span className="font-medium">{m.status}</span>
                      </div>
                      <div>
                        Amount: {m.amount} {detailsQuery.data.group.currency}
                      </div>
                    </div>
                    <div className="text-slate-500">
                      {m.payment_id ? `Payment ${m.payment_id}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
