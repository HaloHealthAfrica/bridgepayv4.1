import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminWithdrawalsPage() {
  const q = useQuery({
    queryKey: ["admin", "wallet_withdrawals"],
    queryFn: async () => apiFetch("/api/admin/wallet/withdrawals"),
  });

  const items = q.data?.items || [];

  return (
    <AdminShell title="Withdrawals">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">Withdrawals</div>
          <div className="text-sm text-slate-600">Latest 100 withdrawals</div>
        </div>
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">
              Withdrawals ({items.length})
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[760px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((it) => (
                      <tr key={it.id} className="border-b">
                        <td className="p-3 text-slate-700">
                          {it.created_at ? String(it.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3 text-slate-700">{it.user_email || it.user_id}</td>
                        <td className="p-3 text-slate-700">{it.method}</td>
                        <td className="p-3 text-slate-700">
                          {it.currency} {it.amount}
                        </td>
                        <td className="p-3 text-slate-700">{it.status}</td>
                        <td className="p-3 text-slate-700">{it.destination}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        No withdrawals.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


