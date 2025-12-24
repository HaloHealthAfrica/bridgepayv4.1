import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Input from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminExternalPaymentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["admin", "external_payments", q, status],
    queryFn: async () =>
      apiFetch(
        `/api/admin/payments/external?limit=100&q=${encodeURIComponent(
          q,
        )}&status=${encodeURIComponent(status)}`,
      ),
  });

  const items = query.data?.items || [];

  return (
    <AdminShell title="External Payments">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">
            External Payments
          </div>
          <div className="text-sm text-slate-600">
            Provider legs tied to payment intents.
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">
                Latest ({items.length})
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
                <div className="w-72">
                  <Input
                    placeholder="Search intent / tx id / type…"
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
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Provider Tx</th>
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
                  ) : items.length ? (
                    items.map((ep) => (
                      <tr key={ep.id} className="border-b">
                        <td className="p-3 text-slate-700">
                          {ep.created_at ? String(ep.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3 text-slate-700">
                          <a
                            className="font-medium text-slate-900 underline"
                            href={`/admin/payments/intents/${ep.payment_intent_id}`}
                          >
                            {ep.payment_intent_id}
                          </a>
                        </td>
                        <td className="p-3 text-slate-700">{ep.type}</td>
                        <td className="p-3 text-slate-700">
                          {ep.currency} {ep.amount}
                        </td>
                        <td className="p-3 text-slate-700">{ep.lemon_tx_id || "-"}</td>
                        <td className="p-3 text-slate-700">{ep.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={6}>
                        No external payments found.
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


