import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Input from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminMerchantsPage() {
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["admin", "merchants", q],
    queryFn: async () =>
      apiFetch(`/api/admin/merchants?limit=100&q=${encodeURIComponent(q)}`),
  });

  const items = query.data?.items || [];

  return (
    <AdminShell title="Merchants">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Merchants</div>
            <div className="text-sm text-slate-600">
              Merchant accounts + fee overrides.
            </div>
          </div>
          <div className="w-80">
            <Input
              placeholder="Search by email/name/id…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">
              Merchants ({items.length})
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[760px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">ID</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {query.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={4}>
                        Loading…
                      </td>
                    </tr>
                  ) : items.length ? (
                    items.map((m) => (
                      <tr key={m.id} className="border-b">
                        <td className="p-3 text-slate-700">{m.id}</td>
                        <td className="p-3 text-slate-700">{m.name || "-"}</td>
                        <td className="p-3 text-slate-700">{m.email}</td>
                        <td className="p-3">
                          <a
                            className="text-sm font-medium text-slate-900 underline"
                            href={`/admin/merchants/${m.id}/fees`}
                          >
                            Fee overrides
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={4}>
                        No merchants found.
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


