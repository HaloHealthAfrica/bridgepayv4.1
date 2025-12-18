"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

export default function MerchantInvoiceDetail(props) {
  const id = props?.params?.id;
  const { data: user, loading } = useUser();
  const qc = useQueryClient();

  const invQ = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const payQ = useQuery({
    queryKey: ["invoice-payments", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}/payments`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const markSent = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/mark-sent`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices-list"] });
    },
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      qc.invalidateQueries({ queryKey: ["invoices-list"] });
    },
  });
  const sendEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      return res.json();
    },
  });

  if (loading) return <div className="p-6">Loading…</div>;
  const role = user?.role;
  const allowed = role === "admin" || role === "merchant";
  if (!allowed) return <div className="p-6">Forbidden</div>;

  const inv = invQ.data?.invoice;
  const items = invQ.data?.items || [];
  const payments = payQ.data?.payments || [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          Invoice {inv ? `#${inv.id}` : ""}
        </h1>
        <div className="flex gap-2">
          <a href={`/i/${id}`} className="text-blue-600 underline">
            Open hosted link
          </a>
          {inv?.status === "draft" && (
            <button
              onClick={() => markSent.mutate()}
              className="text-yellow-700"
            >
              Mark sent
            </button>
          )}
          {(inv?.status === "draft" || inv?.status === "sent") && (
            <button onClick={() => cancel.mutate()} className="text-slate-700">
              Cancel
            </button>
          )}
          <button onClick={() => sendEmail.mutate()} className="text-slate-700">
            Send email
          </button>
        </div>
      </div>

      {!inv ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg">
            <div className="p-3 border-b font-medium">Details</div>
            <div className="p-3 text-sm">
              <div className="flex justify-between">
                <span>Status</span>
                <span>{inv.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{inv.customer_name || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Email</span>
                <span>{inv.customer_email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone</span>
                <span>{inv.customer_phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Due</span>
                <span>
                  {inv.due_date
                    ? new Date(inv.due_date).toLocaleDateString()
                    : "-"}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-2" />
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {Number(inv.subtotal).toFixed(2)} {inv.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>
                  {Number(inv.tax).toFixed(2)} {inv.currency}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>
                  {Number(inv.total).toFixed(2)} {inv.currency}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg">
            <div className="p-3 border-b font-medium">Items</div>
            <div className="p-3 text-sm flex flex-col gap-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <div>
                    {it.name} <span className="text-slate-500">x{it.qty}</span>
                  </div>
                  <div>
                    {Number(it.line_total).toFixed(2)} {inv.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-lg md:col-span-2">
            <div className="p-3 border-b font-medium">Payments</div>
            <div className="p-3 text-sm">
              {payments.length === 0 ? (
                <div className="text-slate-600">No payments yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 px-2">ID</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Amount</th>
                        <th className="py-2 px-2">Ref</th>
                        <th className="py-2 px-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="py-2 px-2">{p.id}</td>
                          <td className="py-2 px-2">{p.status}</td>
                          <td className="py-2 px-2">
                            {Number(p.amount).toFixed(2)}
                          </td>
                          <td className="py-2 px-2">{p.provider_ref || "-"}</td>
                          <td className="py-2 px-2">
                            {new Date(p.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
