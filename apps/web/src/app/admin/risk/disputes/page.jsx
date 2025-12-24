import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Input from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminDisputesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({
    queryKey: ["admin", "disputes", q, status],
    queryFn: async () =>
      apiFetch(
        `/api/admin/disputes?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,
      ),
  });

  const disputes = query.data?.disputes || [];

  return (
    <AdminShell title="Disputes">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">Disputes</div>
          <div className="text-sm text-slate-600">Latest disputes</div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-slate-900">
                Disputes ({disputes.length})
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="open">open</option>
                  <option value="won">won</option>
                  <option value="lost">lost</option>
                  <option value="pending">pending</option>
                </select>
                <div className="w-72">
                  <Input
                    placeholder="Search external id…"
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
                    <th className="p-3">External ID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  ) : disputes.length ? (
                    disputes.map((d) => (
                      <tr key={d.id} className="border-b hover:bg-slate-50">
                        <td className="p-3 text-slate-700">
                          {d.created_at ? String(d.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3">
                          <a
                            className="font-medium text-slate-900 underline"
                            href={`/admin/risk/disputes/${d.id}`}
                          >
                            {d.external_id || d.id}
                          </a>
                        </td>
                        <td className="p-3 text-slate-700">
                          {d.currency} {d.amount}
                        </td>
                        <td className="p-3 text-slate-700">{d.reason}</td>
                        <td className="p-3 text-slate-700">{d.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={5}>
                        No disputes.
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


