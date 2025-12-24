import AdminShell from "@/components/AdminShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminPaymentsHomePage() {
  return (
    <AdminShell title="Payments">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Payment Intents</div>
            <div className="text-xs text-slate-500">Orchestration, funding plans, status</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              View intents and drill into external legs.
            </div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/payments/intents">
              Open
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">External Payments</div>
            <div className="text-xs text-slate-500">Lemonade transactions and status</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              Inspect provider tx ids, failures, and retries.
            </div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/payments/external">
              Open
            </a>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


