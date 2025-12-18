"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

function fmt(amount) {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(Number(amount));
  } catch {
    return String(amount);
  }
}

export default function MerchantBillingPage() {
  const { data: user, loading } = useUser();
  const merchantId = user?.email || null; // use email as merchant id if not provided elsewhere
  const { data, isLoading, error } = useQuery({
    queryKey: ["merchant-fees", merchantId],
    queryFn: async () => {
      if (!merchantId) return { items: [] };
      const res = await fetch(
        `/api/billing/merchant-summary?merchantId=${encodeURIComponent(merchantId)}`,
      );
      if (!res.ok)
        throw new Error(
          `When fetching merchant summary, the response was [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    enabled: !!merchantId,
    refetchOnWindowFocus: false,
  });

  const items = data?.items || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing & Fees</h1>
        <p className="text-gray-500">Fees charged to your account</p>
      </div>
      <div className="border rounded-lg bg-white overflow-auto">
        {loading || isLoading ? (
          <p className="p-4 text-gray-500">Loading...</p>
        ) : error ? (
          <p className="p-4 text-red-600">Could not load</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-gray-500">No fees yet</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-3">Fee Code</th>
                <th className="py-2 px-3">Currency</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-2 px-3">{r.fee_code}</td>
                  <td className="py-2 px-3">{r.currency}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {fmt(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
