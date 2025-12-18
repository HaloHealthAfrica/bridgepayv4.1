"use client";
import { useQuery } from "@tanstack/react-query";

export default function InvoiceSuccessPage(props) {
  const id = props?.params?.id;
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-status", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}/status`);
      if (!res.ok) throw new Error("status");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const status = data?.status;

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-2xl font-semibold mb-2">Thank you!</h1>
      {isLoading ? (
        <p className="text-slate-600">Checking payment status…</p>
      ) : status === "paid" ? (
        <p className="text-green-700">Invoice is paid.</p>
      ) : (
        <p className="text-slate-700">Invoice status: {status}</p>
      )}
      <div className="mt-4">
        <a href={`/i/${id}`} className="text-blue-600 underline">
          Back to invoice
        </a>
      </div>
    </div>
  );
}
