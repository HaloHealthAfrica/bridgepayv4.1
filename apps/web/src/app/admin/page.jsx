import AdminShell from "@/components/AdminShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminHomePage() {
  return (
    <AdminShell title="Overview">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Billing</div>
            <div className="text-xs text-slate-500">
              Revenue, fee configuration, billing ledger
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              Configure monetization and track platform earnings.
            </div>
            <a
              className="text-sm font-medium text-slate-900 underline"
              href="/admin/billing"
            >
              Open
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Operations</div>
            <div className="text-xs text-slate-500">
              Wallet ledger, withdrawals, webhooks (API-backed)
            </div>
          </CardHeader>
          <CardBody className="text-sm text-slate-700">
            This admin portal currently focuses on Billing. We can expand it to
            include disputes, refunds, and payout operations next.
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


