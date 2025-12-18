"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

export default function MerchantInvoicesPage() {
  const { data: user, loading } = useUser();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices-list"],
    queryFn: async () => {
      const res = await fetch("/api/invoices");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const markSent = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/invoices/${id}/mark-sent`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices-list"] }),
  });

  const cancel = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices-list"] }),
  });

  if (loading) return <div className="p-6">Loading…</div>;
  const role = user?.role;
  const allowed = role === "admin" || role === "merchant";
  if (!allowed) return <div className="p-6">Forbidden</div>;

  const invoices = data?.invoices || [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <a
          href="/invoices/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
        >
          New invoice
        </a>
      </div>

      {isLoading ? (
        <div>Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-slate-600">No invoices yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-2">ID</th>
                <th className="py-2 px-2">Customer</th>
                <th className="py-2 px-2">Total</th>
                <th className="py-2 px-2">Status</th>
                <th className="py-2 px-2">Created</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-slate-50">
                  <td className="py-2 px-2">{inv.id}</td>
                  <td className="py-2 px-2">
                    {inv.customer_name || inv.customer_email || "-"}
                  </td>
                  <td className="py-2 px-2">
                    {Number(inv.total).toFixed(2)} {inv.currency}
                  </td>
                  <td className="py-2 px-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${inv.status === "paid" ? "bg-green-100 text-green-700" : inv.status === "cancelled" ? "bg-slate-100 text-slate-600" : inv.status === "sent" ? "bg-yellow-50 text-yellow-700" : "bg-slate-50 text-slate-700"}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {new Date(inv.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 px-2 flex gap-2">
                    <a
                      href={`/i/${inv.id}`}
                      className="text-blue-600 underline"
                    >
                      Open link
                    </a>
                    <a
                      href={`/merchant/invoices/${inv.id}`}
                      className="text-slate-700 underline"
                    >
                      Details
                    </a>
                    {inv.status === "draft" && (
                      <button
                        onClick={() => markSent.mutate(inv.id)}
                        className="text-yellow-700"
                      >
                        Mark sent
                      </button>
                    )}
                    {(inv.status === "draft" || inv.status === "sent") && (
                      <button
                        onClick={() => cancel.mutate(inv.id)}
                        className="text-slate-700"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
