import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminWalletLedgerPage() {
  const q = useQuery({
    queryKey: ["admin", "wallet_ledger"],
    queryFn: async () => apiFetch("/api/admin/wallet/ledger"),
  });

  const items = q.data?.items || [];

  return (
    <AdminShell title="Wallet Ledger">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">Wallet Ledger</div>
          <div className="text-sm text-slate-600">Latest 100 entries (admin API)</div>
        </div>
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Entries ({items.length})</div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[760px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Wallet</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Ref</th>
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
                        <td className="p-3 text-slate-700">{it.user_email || "-"}</td>
                        <td className="p-3 text-slate-700">{it.wallet_id}</td>
                        <td className="p-3 text-slate-700">{it.entry_type}</td>
                        <td className="p-3 text-slate-700">
                          {it.currency} {it.amount}
                        </td>
                        <td className="p-3 text-slate-700">{it.ref}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        No entries.
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


