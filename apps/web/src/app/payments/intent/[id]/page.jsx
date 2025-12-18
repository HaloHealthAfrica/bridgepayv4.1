"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

function useParams() {
  if (typeof window !== "undefined") {
    const m = window.location.pathname.match(/\/payments\/intent\/([^/]+)/);
    return { id: m ? m[1] : null };
  }
  return { id: null };
}

function formatAmount(a, c = "KES") {
  const n = Number(a || 0);
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: c,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function PaymentIntentDetailPage() {
  const { id } = useParams();

  const intentQuery = useQuery({
    queryKey: ["intent", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/payments/intent/${id}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/payments/intent/${id}, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const feesQuery = useQuery({
    queryKey: ["billing-lines", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/billing/transactions/${id}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/billing/transactions/${id}, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const intent = intentQuery.data?.intent;
  const external = intentQuery.data?.external || [];
  const currency = intent?.currency || "KES";

  return (
    <PortalLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-3">
          <div className="text-xs text-slate-500">Payments / Intent</div>
          <div className="flex items-center justify-between mt-1">
            <h1 className="text-2xl font-semibold text-slate-900">
              Payment Intent
            </h1>
          </div>
        </div>

        {intentQuery.isLoading ? (
          <div className="border rounded-lg p-4 bg-white">Loading…</div>
        ) : intentQuery.error ? (
          <div className="border rounded-lg p-4 bg-white text-red-600">
            Could not load intent
          </div>
        ) : !intent ? (
          <div className="border rounded-lg p-4 bg-white">Not found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="text-sm text-slate-600 mb-2">Overview</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Intent ID</div>
                  <code className="px-2 py-1 bg-slate-50 border rounded">
                    {intent.id}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Amount due</div>
                  <div className="font-semibold">
                    {formatAmount(intent.amount_due, currency)}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Currency</div>
                  <div>{intent.currency}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-slate-600">Status</div>
                  <div className="capitalize font-medium">
                    {String(intent.status).toLowerCase()}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-slate-600 mb-2">Funding plan</div>
                <div className="border rounded">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-600">
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Amount</th>
                        <th className="py-2 px-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(intent.funding_plan || []).map((fs, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-2 px-2">{fs.type}</td>
                          <td className="py-2 px-2">
                            {formatAmount(fs.amount, currency)}
                          </td>
                          <td className="py-2 px-2">{fs.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 bg-white">
              <div className="text-sm text-slate-600 mb-2">
                External payments
              </div>
              {external.length === 0 ? (
                <div className="text-slate-500 text-sm">None</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Amount</th>
                      <th className="py-2 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {external.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="py-2 px-2">{e.type}</td>
                        <td className="py-2 px-2">
                          {formatAmount(e.amount, e.currency)}
                        </td>
                        <td className="py-2 px-2 capitalize">
                          {String(e.status).toLowerCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 border rounded-lg p-4 bg-white">
          <div className="text-sm text-slate-600 mb-2">Billing lines</div>
          {feesQuery.isLoading ? (
            <div className="text-slate-500 text-sm">Loading…</div>
          ) : feesQuery.error ? (
            <div className="text-red-600 text-sm">
              Could not load billing lines
            </div>
          ) : (feesQuery.data?.items || []).length === 0 ? (
            <div className="text-slate-500 text-sm">No fees recorded</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 px-2">Code</th>
                  <th className="py-2 px-2">Payer</th>
                  <th className="py-2 px-2">Amount</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {feesQuery.data.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="py-2 px-2">{it.fee_code}</td>
                    <td className="py-2 px-2">{it.payer_account}</td>
                    <td className="py-2 px-2">
                      {formatAmount(it.amount, it.currency)}
                    </td>
                    <td className="py-2 px-2 capitalize">
                      {String(it.status).toLowerCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
