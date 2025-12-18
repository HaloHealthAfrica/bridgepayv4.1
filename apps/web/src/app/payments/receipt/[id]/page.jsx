"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";

export default function ReceiptPage(props) {
  const id = props?.params?.id;
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["receipt", id],
    queryFn: async () => {
      const res = await fetch(`/api/payments/receipt/${id}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/payments/receipt/${id}, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    enabled: !!id,
    retry: false,
  });

  const amountDisplay = useMemo(() => {
    if (!data?.amount) return "";
    const currency = data?.currency || "KES";
    return `${currency} ${Number(data.amount).toFixed(2)}`;
  }, [data]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-gray-500">Loading receipt…</div>
        </div>
      </PortalLayout>
    );
  }

  if (error) {
    console.error(error);
    return (
      <PortalLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div
            className="max-w-[560px] w-full card p-4 text-red-600 bg-red-50 border-red-200"
            style={{ borderColor: "#FCA5A5" }}
          >
            Could not load the receipt. Please try again later.
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!data?.ok) {
    return (
      <PortalLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div
            className="max-w-[560px] w-full card p-4 text-yellow-700 bg-yellow-50"
            style={{ borderColor: "#FDE68A" }}
          >
            This receipt is not available.
          </div>
        </div>
      </PortalLayout>
    );
  }

  const badgeColor =
    data.status === "completed"
      ? "bg-green-100 text-green-800"
      : data.status === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800";

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Page header + breadcrumb */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">Payments / Receipt</div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900">
              Receipt
            </h1>
            <p className="text-sm text-gray-500">#{data.receiptId}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/wallet"
              className="hidden md:inline-block px-3 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
            >
              Back to Wallet
            </a>
            <button
              onClick={onCopy}
              className="px-3 py-2 rounded-md btn-primary text-sm"
              aria-label="Copy link"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Receipt card */}
        <div className="card p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-[#111]">
                Payment Receipt
              </h2>
              <p className="text-sm text-gray-500">
                Reference: {data.reference || "—"}
              </p>
            </div>
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${badgeColor}`}
            >
              {data.status}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500">Amount</div>
              <div className="text-3xl md:text-4xl font-bold text-[#111]">
                {amountDisplay}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500">Dates</div>
              <div className="text-[#111]">
                <div>
                  Created:{" "}
                  {data.createdAt
                    ? new Date(data.createdAt).toLocaleString()
                    : "—"}
                </div>
                <div>
                  Completed:{" "}
                  {data.completedAt
                    ? new Date(data.completedAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500">References</div>
              <div className="text-[#111] break-words">
                <div>
                  <span className="text-gray-500">Reference:</span>{" "}
                  {data.reference || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Provider Ref:</span>{" "}
                  {data.provider_ref || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Transaction ID:</span>{" "}
                  {data.transaction_id || "—"}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500">Payer</div>
              <div className="text-[#111]">
                <div>
                  <span className="text-gray-500">Name:</span>{" "}
                  {data.payer?.name || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  {data.payer?.phone || "—"}
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>{" "}
                  {data.payer?.email || "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-2">Line Items</div>
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="flex items-center justify-between p-3 md:p-4">
                <div className="text-[#111]">
                  {data.lineItems?.[0]?.title || "Payment"}
                </div>
                <div className="text-[#111]">{amountDisplay}</div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row gap-3">
            <button
              onClick={onCopy}
              className="px-4 py-2 rounded btn-primary text-white hover:opacity-90"
              aria-label="Copy link"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              disabled
              className="px-4 py-2 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
              aria-label="Download PDF"
            >
              Download PDF
            </button>
            <button
              disabled
              className="px-4 py-2 rounded bg-gray-200 text-gray-600 cursor-not-allowed"
              aria-label="Email receipt"
            >
              Email receipt
            </button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
