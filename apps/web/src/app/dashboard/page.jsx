import { useEffect } from "react";
import useUser from "@/utils/useUser";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function DashboardPage() {
  const { data: user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/account/signin";
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Signed in as</div>
              <div className="text-xl font-semibold text-slate-900">
                {user.email}
              </div>
              <div className="text-sm text-slate-600">Role: {user.role}</div>
            </div>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/api/auth/logout")}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Billing</div>
            <div className="text-xs text-slate-500">
              Fees catalog, billing ledger, platform revenue
            </div>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <div className="text-sm text-slate-700">
              Admins can configure fees and review billing activity.
            </div>
            <Button
              onClick={() => (window.location.href = "/admin/billing")}
              disabled={user.role !== "admin"}
            >
              Open Admin Billing
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">Developer</div>
            <div className="text-xs text-slate-500">
              Helpful links for testing
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            <a className="text-sm text-slate-700 underline" href="/api/auth/health">
              Auth health
            </a>
            <a className="text-sm text-slate-700 underline" href="/api/debug/session">
              Session debug
            </a>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}


