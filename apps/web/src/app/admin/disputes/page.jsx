"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

function useDisputes({ status, q }) {
  return useQuery({
    queryKey: ["admin-disputes", { status, q }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/disputes?${params.toString()}`);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) throw new Error(json?.error || `Failed: ${res.status}`);
      return json?.disputes || [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export default function AdminDisputesPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const {
    data: disputes = [],
    isLoading,
    error,
  } = useDisputes({ status: status || undefined, q: q || undefined });
  const [selected, setSelected] = useState(null);

  const openRow = async (id) => {
    const res = await fetch(`/api/admin/disputes/${id}`);
    const json = await res.json();
    if (res.ok) setSelected(json);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold text-slate-900">Disputes</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="opened">opened</option>
            <option value="evidence_required">evidence_required</option>
            <option value="under_review">under_review</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
            <option value="resolved">resolved</option>
            <option value="cancelled">cancelled</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search external id"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

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
          ) : disputes.length === 0 ? (
            <div className="text-slate-500 text-sm">No disputes</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-600">
                  <tr>
                    <th className="py-2 pr-2">External ID</th>
                    <th className="py-2 pr-2">Amount</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Payment</th>
                    <th className="py-2 pr-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <tr
                      key={d.id}
                      className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => openRow(d.id)}
                    >
                      <td className="py-2 pr-2 font-mono text-xs break-all">
                        {d.external_id}
                      </td>
                      <td className="py-2 pr-2">
                        {d.amount} {d.currency}
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${d.status === "won" ? "bg-green-100 text-green-800" : d.status === "lost" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-800"}`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        {d.payment_id ? `#${d.payment_id}` : "-"}
                      </td>
                      <td className="py-2 pr-2 text-slate-500">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-800">
                Dispute details
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-500 text-sm"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded p-2 overflow-x-auto">
                <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(selected.dispute, null, 2)}
                </pre>
              </div>
              <div className="bg-slate-50 rounded p-2 overflow-x-auto">
                <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words">
                  {JSON.stringify(selected.payment, null, 2)}
                </pre>
              </div>
            </div>
            {selected?.payment?.id && (
              <div className="mt-3 text-right">
                <a
                  href={`/payments/receipt/${selected.payment.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Open receipt
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
