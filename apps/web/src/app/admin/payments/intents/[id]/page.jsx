import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminPaymentIntentDetailPage({ params }) {
  const id = params?.id;
  const q = useQuery({
    queryKey: ["payments", "intent", id],
    queryFn: async () => apiFetch(`/api/payments/intent/${id}`),
    enabled: !!id,
  });

  const intent = q.data?.intent || null;
  const external = q.data?.external || [];

  return (
    <AdminShell title="Payment Intent Detail">
      <div className="space-y-6">
        <div>
          <div className="text-xl font-semibold text-slate-900">
            Intent {id}
          </div>
          <div className="text-sm text-slate-600">
            Status + funding plan + external legs
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">Summary</div>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {q.isLoading ? (
                <div className="text-slate-600">Loading…</div>
              ) : !intent ? (
                <div className="text-slate-600">Not found</div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Status</div>
                    <div className="font-medium text-slate-900">{intent.status}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Amount</div>
                    <div className="font-medium text-slate-900">
                      {intent.currency} {intent.amount_due}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Customer (user_id)</div>
                    <div className="font-medium text-slate-900">{intent.user_id}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Merchant (merchant_id)</div>
                    <div className="font-medium text-slate-900">{intent.merchant_id || "-"}</div>
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">Funding Plan</div>
            </CardHeader>
            <CardBody>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
                {intent ? JSON.stringify(intent.funding_plan || [], null, 2) : "[]"}
              </pre>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">
              External Payments ({external.length})
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="max-h-[520px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr className="text-left text-slate-600">
                    <th className="p-3">Created</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Provider Tx</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {q.isLoading ? (
                    <tr>
                      <td className="p-3 text-slate-600" colSpan={5}>
                        Loading…
                      </td>
                    </tr>
                  ) : external.length ? (
                    external.map((ep) => (
                      <tr key={ep.id} className="border-b">
                        <td className="p-3 text-slate-700">
                          {ep.created_at ? String(ep.created_at).slice(0, 19) : "-"}
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
                      <td className="p-3 text-slate-600" colSpan={5}>
                        No external legs.
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


