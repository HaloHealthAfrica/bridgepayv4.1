"use client";
import { useQuery } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

export default function AdminWalletWebhooksPage() {
  const q = useQuery({
    queryKey: ["admin-wallet-webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wallet/webhooks");
      if (!res.ok) throw new Error(`Fetch failed [${res.status}]`);
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Wallet Webhooks</h1>
        <p className="text-slate-500">Latest 100 webhook payloads</p>
      </div>
      <div className="card p-4 overflow-x-auto">
        {q.isLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : q.error ? (
          <div className="text-sm text-rose-600">Could not load</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Received</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Order Ref</th>
                <th className="py-2 pr-4">Provider Tx</th>
                <th className="py-2 pr-4">Payload</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items || []).map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="py-2 pr-4">
                    {new Date(r.received_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{r.event_type}</td>
                  <td className="py-2 pr-4">
                    {r.related_order_reference || "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {r.related_provider_tx_id || "-"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-slate-600 max-w-[480px] truncate">
                    {JSON.stringify(r.payload)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PortalLayout>
  );
}
