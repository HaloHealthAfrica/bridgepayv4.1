"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

function formatCurrency(n, currency = "KES") {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export default function AdminHomePage() {
  const qc = useQueryClient();
  const revenueQuery = useQuery({
    queryKey: ["platform-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/billing/platform-revenue");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/billing/platform-revenue, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const rows = revenueQuery.data?.revenue || [];

  // Demo billing seed mutation
  const seedDemo = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/seed-demo", { method: "POST" });
      if (!res.ok) {
        throw new Error(
          `When posting /api/billing/seed-demo, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-revenue"] });
    },
  });

  return (
    <PortalLayout>
      <div className="p-4 md:p-8">
        <div className="mb-4">
          <div className="text-xs text-slate-500">Admin</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">
            Overview
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-sm text-slate-600">Platform Revenue</div>
            {revenueQuery.isLoading ? (
              <div className="mt-2 text-slate-500">Loading…</div>
            ) : revenueQuery.error ? (
              <div className="mt-2 text-red-600 text-sm">
                Could not load revenue
              </div>
            ) : rows.length === 0 ? (
              <div className="mt-2 text-slate-500">No fees posted yet</div>
            ) : (
              <div className="mt-3 space-y-1">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="text-slate-600 text-sm">{r.currency}</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(r.total, r.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Seed Demo Billing</div>
              <button
                onClick={() => seedDemo.mutate()}
                disabled={seedDemo.isLoading}
                className="px-3 py-1.5 text-sm rounded border"
              >
                {seedDemo.isLoading ? "Running…" : "Run Demo"}
              </button>
            </div>
            {seedDemo.isError && (
              <div className="mt-2 text-red-600 text-sm">
                {String(seedDemo.error?.message || seedDemo.error)}
              </div>
            )}
            {seedDemo.isSuccess && seedDemo.data && (
              <div className="mt-3 text-sm">
                <div className="text-slate-600 mb-2">
                  Balances (after demo):
                </div>
                <div className="space-y-1">
                  {(seedDemo.data.balances || []).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between"
                    >
                      <div className="text-slate-600">
                        {b.email || b.user_id} – {b.currency}
                      </div>
                      <div className="font-medium">
                        {formatCurrency(b.balance, b.currency)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* New: quick link to the demo payment intent if created */}
                {seedDemo.data.paymentIntentId ? (
                  <div className="mt-3">
                    <a
                      href={`/payments/intent/${seedDemo.data.paymentIntentId}`}
                      className="text-blue-600 hover:underline"
                    >
                      View demo Payment Intent →
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
