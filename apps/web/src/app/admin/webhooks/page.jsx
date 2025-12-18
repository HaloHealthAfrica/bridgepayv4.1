"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function WebhookMonitorPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["webhooks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/lemonade/webhook");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/integrations/lemonade/webhook, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
  });

  const reprocess = useMutation({
    mutationFn: async (eventId) => {
      const res = await fetch("/api/integrations/lemonade/webhook/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to reprocess");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks", "list"] });
    },
    onError: (e) => {
      console.error(e);
    },
  });

  const events = data?.events || [];
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const txt =
          `${e.id} ${e.payment_id} ${e.transaction_id || ""}`.toLowerCase();
        if (!txt.includes(s)) return false;
      }
      return true;
    });
  }, [events, statusFilter, search]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold text-[#111] mb-4">
        Webhook Events
      </h1>

      <div className="flex flex-col md:flex-row gap-3 md:items-end mb-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-sm text-gray-600 mb-1">
            Search (payment id or transaction id)
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g., 123 or ABC123"
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>
      </div>

      {isLoading && <div className="text-gray-500">Loading…</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          Failed to load events
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-sm p-2 border-b">ID</th>
              <th className="text-left text-sm p-2 border-b">Created</th>
              <th className="text-left text-sm p-2 border-b">Payment</th>
              <th className="text-left text-sm p-2 border-b">Status</th>
              <th className="text-left text-sm p-2 border-b">Verified</th>
              <th className="text-left text-sm p-2 border-b">Transaction</th>
              <th className="text-left text-sm p-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b">
                <td className="p-2 text-sm">{e.id}</td>
                <td className="p-2 text-sm">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                </td>
                <td className="p-2 text-sm">{e.payment_id}</td>
                <td className="p-2 text-sm capitalize">{e.status || "—"}</td>
                <td className="p-2 text-sm">{e.verified ? "true" : "false"}</td>
                <td className="p-2 text-sm">{e.transaction_id || "—"}</td>
                <td className="p-2 text-sm">
                  <button
                    onClick={() => reprocess.mutate(e.id)}
                    className="px-3 py-1 rounded bg-[#111] text-white text-sm hover:opacity-90"
                    disabled={reprocess.isLoading}
                  >
                    Reprocess
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={7}
                  className="p-4 text-sm text-gray-500 text-center"
                >
                  No events
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
