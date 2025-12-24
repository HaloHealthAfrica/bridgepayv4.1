import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useMemo, useState } from "react";

export default function AdminBillingLedgerPage() {
  const [limit, setLimit] = useState(200);
  const q = useQuery({
    queryKey: ["billing", "ledger", limit],
    queryFn: async () => apiFetch(`/api/billing/ledger?limit=${limit}`),
  });

  const items = q.data?.items || [];
  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return items;
    return items.filter((it) => {
      const hay = `${it.transaction_type} ${it.transaction_id} ${it.fee_code} ${it.payer_account} ${it.status} ${it.ref}`.toLowerCase();
      return hay.includes(f);
    });
  }, [items, filter]);

  return (
    <AdminShell title="Billing Ledger">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Ledger</div>
            <div className="text-sm text-slate-600">
              Recorded fee postings (pending and posted).
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-slate-600">Limit</div>
            <Input
              className="w-24"
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 200)))}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">
                Entries ({filtered.length})
              </div>
              <div className="w-80">
                <Input
                  placeholder="Filter by txn id / fee code / ref…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[680px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">Txn</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payer</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map((it) => (
                      <tr key={it.id} className="border-b">
                        <td className="p-3 text-slate-700">
                          {it.created_at ? String(it.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="font-medium text-slate-900">{it.transaction_type}</div>
                          <div className="text-xs text-slate-500">{it.transaction_id}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          <div className="font-medium text-slate-900">{it.fee_code}</div>
                          <div className="text-xs text-slate-500">{it.ref}</div>
                        </td>
                        <td className="p-3 text-slate-700">
                          {it.currency} {it.amount}
                        </td>
                        <td className="p-3 text-slate-700">{it.payer_account}</td>
                        <td className="p-3 text-slate-700">{it.status}</td>
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


