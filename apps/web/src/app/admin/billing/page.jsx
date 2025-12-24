import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Button from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "sonner";

export default function AdminBillingOverviewPage() {
  const qc = useQueryClient();

  const revenueQ = useQuery({
    queryKey: ["billing", "revenue"],
    queryFn: async () => apiFetch("/api/billing/platform-revenue"),
  });
  const feesQ = useQuery({
    queryKey: ["billing", "fees"],
    queryFn: async () => apiFetch("/api/billing/fees"),
  });

  const seed = useMutation({
    mutationFn: async () =>
      apiFetch("/api/billing/fees/seed", { method: "POST" }),
    onSuccess: async () => {
      toast.success("Seeded default fees");
      await qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => toast.error(e?.message || "Failed to seed fees"),
  });

  const fees = feesQ.data?.fees || [];
  const activeFees = fees.filter((f) => String(f.status) === "active");
  const postedRevenue = revenueQ.data?.revenue || [];
  const pendingRevenue = revenueQ.data?.pending || [];

  return (
    <AdminShell title="Billing Overview">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">Billing</div>
            <div className="text-sm text-slate-600">
              Configure fees and track platform revenue.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/admin/billing/fees")}
            >
              Manage fees
            </Button>
            <Button onClick={() => seed.mutate()} disabled={seed.isPending}>
              {seed.isPending ? "Seeding…" : "Seed default fees"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">
                Active fees
              </div>
            </CardHeader>
            <CardBody>
              <div className="text-3xl font-semibold text-slate-900">
                {feesQ.isLoading ? "…" : activeFees.length}
              </div>
              <div className="text-sm text-slate-600">
                out of {feesQ.isLoading ? "…" : fees.length} catalog entries
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">
                Posted revenue
              </div>
            </CardHeader>
            <CardBody className="space-y-1">
              {revenueQ.isLoading ? (
                <div className="text-slate-600">Loading…</div>
              ) : postedRevenue.length ? (
                postedRevenue.map((r) => (
                  <div key={r.currency} className="flex justify-between text-sm">
                    <div className="text-slate-600">{r.currency}</div>
                    <div className="font-medium text-slate-900">{r.total}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-600">No revenue yet</div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">
                Pending (frozen)
              </div>
            </CardHeader>
            <CardBody className="space-y-1">
              {revenueQ.isLoading ? (
                <div className="text-slate-600">Loading…</div>
              ) : pendingRevenue.length ? (
                pendingRevenue.map((r) => (
                  <div key={r.currency} className="flex justify-between text-sm">
                    <div className="text-slate-600">{r.currency}</div>
                    <div className="font-medium text-slate-900">{r.total}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-600">None</div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-slate-900">
              Next steps
            </div>
          </CardHeader>
          <CardBody className="text-sm text-slate-700 space-y-2">
            <div>
              - Configure which flows are monetized in{" "}
              <a className="underline" href="/admin/billing/fees">
                Fees Catalog
              </a>
              .
            </div>
            <div>
              - Review fee postings in{" "}
              <a className="underline" href="/admin/billing/ledger">
                Billing Ledger
              </a>
              .
            </div>
          </CardBody>
        </Card>
      </div>
    </AdminShell>
  );
}


