"use client";
import { useQuery } from "@tanstack/react-query";

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

export default function AdminBillingLedgerPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["billing-ledger-recent"],
    queryFn: async () => {
      const res = await fetch("/api/billing/ledger?limit=200");
      if (!res.ok)
        throw new Error(
          `When fetching /api/billing/ledger, the response was [${res.status}] ${res.statusText}`,
        );
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const rows = data?.items || [];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing – Ledger</h1>
        <p className="text-gray-500">Recent fee entries (last 200)</p>
      </div>
      <div className="border rounded-lg bg-white overflow-auto">
        {isLoading ? (
          <p className="p-4 text-gray-500">Loading...</p>
        ) : error ? (
          <p className="p-4 text-red-600">Could not load</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-gray-500">No entries yet</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2 px-3">When</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Tx Id</th>
                <th className="py-2 px-3">Fee</th>
                <th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3">Payer</th>
                <th className="py-2 px-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 px-3 whitespace-nowrap">
                    {r.created_at}
                  </td>
                  <td className="py-2 px-3">{r.transaction_type}</td>
                  <td className="py-2 px-3">{r.transaction_id}</td>
                  <td className="py-2 px-3">{r.fee_code}</td>
                  <td className="py-2 px-3 text-right font-medium">
                    {fmt(r.amount)}
                  </td>
                  <td className="py-2 px-3">{r.payer_account}</td>
                  <td className="py-2 px-3">{r.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
