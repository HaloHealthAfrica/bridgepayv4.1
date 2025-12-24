import { useQuery } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminDisputeDetailPage({ params }) {
  const id = params?.id;
  const q = useQuery({
    queryKey: ["admin", "dispute", id],
    queryFn: async () => apiFetch(`/api/admin/disputes/${id}`),
    enabled: !!id,
  });

  const dispute = q.data?.dispute || null;
  const payment = q.data?.payment || null;

  return (
    <AdminShell title="Dispute Detail">
      <div className="space-y-6">
        <div>
          <div className="text-xl font-semibold text-slate-900">Dispute {id}</div>
          <div className="text-sm text-slate-600">Details + linked payment</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">Dispute</div>
            </CardHeader>
            <CardBody>
              {q.isLoading ? (
                <div className="text-slate-600">Loading…</div>
              ) : !dispute ? (
                <div className="text-slate-600">Not found</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <div className="text-slate-600">External ID</div>
                    <div className="font-medium text-slate-900">{dispute.external_id || "-"}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Amount</div>
                    <div className="font-medium text-slate-900">
                      {dispute.currency} {dispute.amount}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Reason</div>
                    <div className="font-medium text-slate-900">{dispute.reason}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Status</div>
                    <div className="font-medium text-slate-900">{dispute.status}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Payment ID</div>
                    <div className="font-medium text-slate-900">{dispute.payment_id || "-"}</div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">Linked Payment</div>
            </CardHeader>
            <CardBody>
              {!payment ? (
                <div className="text-sm text-slate-600">No linked payment.</div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <div className="text-slate-600">ID</div>
                    <div className="font-medium text-slate-900">{payment.id}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Amount</div>
                    <div className="font-medium text-slate-900">{payment.amount}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Status</div>
                    <div className="font-medium text-slate-900">{payment.status}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Provider Ref</div>
                    <div className="font-medium text-slate-900">{payment.provider_ref || "-"}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-slate-600">Order Ref</div>
                    <div className="font-medium text-slate-900">{payment.order_reference || "-"}</div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Metadata</div>
          </CardHeader>
          <CardBody>
            <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto">
              {dispute ? JSON.stringify(dispute.metadata || {}, null, 2) : "{}"}
            </pre>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


