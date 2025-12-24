import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminWebhookEventsPage() {
  const q = useQuery({
    queryKey: ["admin", "webhooks", "lemonade"],
    queryFn: async () => apiFetch("/api/integrations/lemonade/webhook"),
  });

  const events = q.data?.events || [];

  return (
    <AdminShell title="Webhook Events">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">
            Lemonade Webhook Events
          </div>
          <div className="text-sm text-slate-600">Latest 100 deliveries</div>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">
              Events ({events.length})
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[760px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Tx ID</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  ) : events.length ? (
                    events.map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="p-3 text-slate-700">
                          {e.created_at ? String(e.created_at).slice(0, 19) : "-"}
                        </td>
                        <td className="p-3 text-slate-700">{e.type || "-"}</td>
                        <td className="p-3 text-slate-700">{e.transaction_id || "-"}</td>
                        <td className="p-3 text-slate-700">{e.status}</td>
                        <td className="p-3 text-slate-700">{e.verified ? "yes" : "no"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={5}>
                        No events.
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


