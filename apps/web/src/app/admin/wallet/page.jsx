import AdminShell from "@/components/AdminShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function AdminWalletHomePage() {
  return (
    <AdminShell title="Wallet Ops">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Wallet Ledger</div>
            <div className="text-xs text-slate-500">Credits/debits and balance changes</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">Review ledger entries across wallets.</div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/wallet/ledger">
              Open
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Funding Sessions</div>
            <div className="text-xs text-slate-500">Top-ups and funding attempts</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">Track funding session status.</div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/wallet/sessions">
              Open
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Withdrawals</div>
            <div className="text-xs text-slate-500">Payouts and withdrawals</div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">View recent withdrawal attempts.</div>
            <a className="text-sm font-medium text-slate-900 underline" href="/admin/wallet/withdrawals">
              Open
            </a>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


