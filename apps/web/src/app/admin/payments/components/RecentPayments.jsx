export function RecentPayments({ recentQuery, onViewPayment }) {
  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Recent payments
        </h3>
        <button
          onClick={() => recentQuery.refetch()}
          className="text-xs px-3 py-1 rounded-md bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          Refresh
        </button>
      </div>
      {recentQuery.isLoading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : recentQuery.error ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {(recentQuery.error && recentQuery.error.message) || "Failed to load"}
        </div>
      ) : Array.isArray(recentQuery.data?.payments) &&
        recentQuery.data.payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 border-b border-slate-200">ID</th>
                <th className="px-2 py-1 border-b border-slate-200">Created</th>
                <th className="px-2 py-1 border-b border-slate-200">Amount</th>
                <th className="px-2 py-1 border-b border-slate-200">Status</th>
                <th className="px-2 py-1 border-b border-slate-200">Type</th>
                <th className="px-2 py-1 border-b border-slate-200">
                  Order Ref
                </th>
                <th className="px-2 py-1 border-b border-slate-200">
                  Provider Ref
                </th>
                <th className="px-2 py-1 border-b border-slate-200"></th>
              </tr>
            </thead>
            <tbody>
              {recentQuery.data.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                    {p.id}
                  </td>
                  <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                    {p.amount}
                  </td>
                  <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                    {p.status}
                  </td>
                  <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                    {p.type}
                  </td>
                  <td
                    className="px-2 py-1 border-b border-slate-100 text-slate-700"
                    title={p.order_reference}
                  >
                    {(p.order_reference || "").slice(0, 18)}
                    {(p.order_reference || "").length > 18 ? "…" : ""}
                  </td>
                  <td
                    className="px-2 py-1 border-b border-slate-100 text-slate-700"
                    title={p.provider_ref}
                  >
                    {(p.provider_ref || "").slice(0, 18)}
                    {(p.provider_ref || "").length > 18 ? "…" : ""}
                  </td>
                  <td className="px-2 py-1 border-b border-slate-100 text-right">
                    <button
                      onClick={() => onViewPayment(p.id)}
                      className="text-xs px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-slate-600">No payments yet.</div>
      )}
    </div>
  );
}
