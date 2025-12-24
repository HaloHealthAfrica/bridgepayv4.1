import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Input from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminPaymentIntentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["admin", "payment_intents", q, status],
    queryFn: async () =>
      apiFetch(
        `/api/admin/payments/intents?limit=100&q=${encodeURIComponent(
          q,
        )}&status=${encodeURIComponent(status)}`,
      ),
  });

  const items = query.data?.items || [];
  const filtered = useMemo(() => items, [items]);

  return (
    <AdminShell title="Payment Intents">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">
              Payment Intents
            </div>
            <div className="text-sm text-slate-600">
              Orchestration objects and settlement status.
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">
                Latest ({filtered.length})
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FUNDED_PENDING_SETTLEMENT">
                    FUNDED_PENDING_SETTLEMENT
                  </option>
                  <option value="SETTLED">SETTLED</option>
                  <option value="FAILED">FAILED</option>
                </select>
                <div className="w-72">
                  <Input
                    placeholder="Search id / user / merchant…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[720px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">Intent</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map((it) => (
                      <tr key={it.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-slate-700">
                          {it.created_at ? String(it.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3">
                          <a
                            className="font-medium text-slate-900 underline"
                            href={`/admin/payments/intents/${it.id}`}
                          >
                            {String(it.id).slice(0, 10)}
                          </a>
                          <div className="text-xs text-slate-500">
                            {it.currency}
                          </div>
                        </td>
                        <td className="p-3 text-slate-700">
                          {it.user_email || it.user_id}
                        </td>
                        <td className="p-3 text-slate-700">
                          {it.merchant_email || it.merchant_id || "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          {it.amount_due}
                        </td>
                        <td className="p-3 text-slate-700">{it.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        No intents found.
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


