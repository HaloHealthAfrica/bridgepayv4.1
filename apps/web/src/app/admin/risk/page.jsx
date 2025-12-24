import AdminShell from "@/components/AdminShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminRiskHomePage() {
  return (
    <AdminShell title="Risk">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Disputes</div>
            <div className="text-xs text-slate-500">Chargebacks / disputes</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              View disputes and drill into related payments.
            </div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/risk/disputes">
              Open
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Webhook Events</div>
            <div className="text-xs text-slate-500">Lemonade webhook monitor</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              Review latest webhook deliveries and verification.
            </div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/risk/webhooks">
              Open
            </a>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


