"use client";
import { useQuery } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

function formatCurrency(n) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(Number(n || 0));
}

export default function AdminWalletSessionsPage() {
  const q = useQuery({
    queryKey: ["admin-wallet-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/wallet/sessions");
      if (!res.ok) throw new Error(`Fetch failed [${res.status}]`);
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <PortalLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Funding Sessions</h1>
        <p className="text-slate-500">Latest 100 sessions</p>
      </div>
      <div className="card p-4 overflow-x-auto">
        {q.isLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : q.error ? (
          <div className="text-sm text-rose-600">Could not load sessions</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Order Ref</th>
              </tr>
            </thead>
            <tbody>
              {(q.data?.items || []).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">{r.user_email || "-"}</td>
                  <td className="py-2 pr-4">{r.method}</td>
                  <td className="py-2 pr-4 font-medium">
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {r.order_reference || "-"}
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
