import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Copy,
  RefreshCcw,
  FileText,
  ArrowLeft,
  Loader2,
} from "lucide-react";
// ADD: shared layout for consistent header + sidebar
import PortalLayout from "@/components/PortalLayout";

function useParams() {
  // The Anything router passes params to the page function normally, but on client side we can parse from location
  // We'll try to read from global if available, else fallback to URL parsing.
  if (typeof window !== "undefined") {
    const match = window.location.pathname.match(/\/pay\/success\/([^/]+)/);
    return { id: match ? match[1] : null };
  }
  return { id: null };
}

function StatusBadge({ status }) {
  const s = String(status || "pending").toLowerCase();
  const base =
    "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium";
  if (s === "completed")
    return (
      <span className={`${base} bg-green-100 text-green-800`}>
        <CheckCircle2 size={16} />
        Completed
      </span>
    );
  if (s === "failed")
    return (
      <span className={`${base} bg-red-100 text-red-800`}>
        <XCircle size={16} />
        Failed
      </span>
    );
  return (
    <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>
  );
}

function formatAmount(a) {
  if (a == null) return "-";
  const n = Number(a);
  if (Number.isNaN(n)) return String(a);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PaySuccessPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [confetti, setConfetti] = useState(false);
  const pollingRef = useRef(null);

  const paymentQuery = useQuery({
    queryKey: ["payment", id],
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/payments/lemonade/${id}`);
      if (!res.ok) {
        const t = await res.text();
        let j = null;
        try {
          j = t ? JSON.parse(t) : null;
        } catch {}
        const err = new Error("fetch_failed");
        err.status = res.status;
        err.json = j;
        throw err;
      }
      const data = await res.json();
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payments/lemonade/status-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: Number(id) }),
      });
      if (!res.ok) {
        const t = await res.text();
        let j = null;
        try {
          j = t ? JSON.parse(t) : null;
        } catch {}
        throw Object.assign(new Error("status_failed"), {
          status: res.status,
          json: j,
        });
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["payment", id] });
    },
  });

  const status = paymentQuery.data?.payment?.status;
  useEffect(() => {
    if (status === "completed") {
      // Fire confetti for ~1s
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 1000);
      return () => clearTimeout(t);
    }
  }, [status]);

  // Polling while pending
  useEffect(() => {
    if (status === "pending" && !statusMutation.isPending) {
      pollingRef.current = setInterval(() => {
        statusMutation.mutate();
      }, 5000);
      return () => clearInterval(pollingRef.current);
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [status, statusMutation]);

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast("Copied");
    }
  };

  if (paymentQuery.isLoading) {
    // WRAP loading state with PortalLayout for consistent chrome
    return (
      <PortalLayout>
        <div className="p-4 md:p-8 max-w-[900px] mx-auto">
          <div className="card p-6">Loading…</div>
        </div>
      </PortalLayout>
    );
  }
  if (paymentQuery.isError) {
    const st = paymentQuery.error?.status;
    if (st === 404) {
      return (
        <PortalLayout>
          <div className="min-h-[60vh] p-4 md:p-8 flex items-center justify-center">
            <div className="max-w-[560px] w-full border rounded-lg p-6 bg-white">
              <h1 className="text-lg font-semibold mb-2">
                We couldn’t find that payment
              </h1>
              <a
                href="/pay"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border"
              >
                <ArrowLeft size={16} /> Back to Pay
              </a>
            </div>
          </div>
        </PortalLayout>
      );
    }
    return (
      <PortalLayout>
        <div className="p-4 md:p-8 max-w-[900px] mx-auto">
          <div className="card p-6">
            Something went wrong. Please try again.
          </div>
        </div>
      </PortalLayout>
    );
  }

  const payment = paymentQuery.data?.payment;
  const txns = paymentQuery.data?.transactions || [];
  const amount = payment?.amount;
  const orderRef = payment?.order_reference;
  const providerRef = payment?.provider_ref;
  const createdAt = payment?.created_at;
  const updatedAt = payment?.updated_at;
  const meta = payment?.metadata || {};
  const sent = meta?.sent_payload || {};
  const isSTK = payment?.type === "paybill";

  const copyLink = (suffix) => {
    const href =
      typeof window !== "undefined"
        ? `${window.location.origin}${suffix}`
        : suffix;
    onCopy(href);
  };

  return (
    <PortalLayout>
      <div className="p-4 md:p-8 max-w-[900px] mx-auto">
        <Toaster position="top-right" richColors />

        {/* Page header + breadcrumb */}
        <div className="mb-3">
          <div className="text-xs text-slate-500">Payments / Receipt</div>
          <div className="flex items-center justify-between mt-1">
            <h1 className="text-2xl font-semibold text-slate-900">Payment</h1>
            <div className="flex items-center gap-2">
              <StatusBadge status={payment?.status} />
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-3xl font-bold">
                KES {formatAmount(amount)}
              </div>
              <div className="text-sm text-[#666]">
                Last updated:{" "}
                {updatedAt ? new Date(updatedAt).toLocaleString() : "-"}
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <a
                href={`/payments/receipt/${payment?.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#0066FF] hover:bg-[#0057d6] text-white"
              >
                <FileText size={16} /> View receipt
              </a>
              <button
                onClick={() => statusMutation.mutate()}
                disabled={statusMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border"
              >
                {statusMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <RefreshCcw size={16} />
                )}{" "}
                Check status
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <div className="text-sm text-[#444] mb-1">Reference</div>
              <div className="flex items-center gap-2">
                <code
                  className="px-2 py-1 rounded bg-[#f7f7f7] border overflow-hidden text-ellipsis whitespace-nowrap w-full"
                  title={orderRef}
                >
                  {orderRef}
                </code>
                <button
                  className="px-2 py-1 border rounded-md"
                  onClick={() => onCopy(orderRef)}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm text-[#444] mb-1">Provider Ref</div>
              <div className="flex items-center gap-2">
                <code
                  className="px-2 py-1 rounded bg-[#f7f7f7] border overflow-hidden text-ellipsis whitespace-nowrap w-full"
                  title={providerRef || "-"}
                >
                  {providerRef || "-"}
                </code>
                {providerRef && (
                  <button
                    className="px-2 py-1 border rounded-md"
                    onClick={() => onCopy(providerRef)}
                  >
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-[#444] mb-1">Payment link</div>
            <div className="flex items-center gap-2">
              <code
                className="px-2 py-1 rounded bg-[#f7f7f7] border overflow-hidden text-ellipsis whitespace-nowrap w-full"
                title={
                  typeof window !== "undefined" ? window.location.href : ""
                }
              >
                {typeof window !== "undefined" ? window.location.href : ""}
              </code>
              <button
                className="px-2 py-1 border rounded-md"
                onClick={() => copyLink(`/pay/success/${payment?.id}`)}
              >
                <LinkIcon size={16} />
              </button>
            </div>
          </div>

          {/* Receipt banner */}
          <div className="mt-6 p-3 border rounded-md bg-[#fafafa]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Save your receipt</div>
                <div className="text-sm text-[#666]">
                  Keep this for your records. It includes masked payer details
                  and references.
                </div>
              </div>
              <a
                href={`/payments/receipt/${payment?.id}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#0066FF] hover:bg-[#0057d6] text-white"
              >
                <FileText size={16} /> View receipt
              </a>
            </div>
          </div>

          {/* Tertiary: change number while pending for STK */}
          {payment?.status === "pending" && isSTK && (
            <div className="mt-4">
              <a
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border"
                href={`/pay?method=stk&amount=${encodeURIComponent(payment?.amount)}&reference=${encodeURIComponent(orderRef || "")}&phone=${encodeURIComponent(sent?.phone_number || "")}`}
              >
                <ArrowLeft size={16} /> Change number
              </a>
            </div>
          )}

          {/* Completed / Failed notes */}
          {payment?.status === "completed" && (
            <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800">
              Payment confirmed
            </div>
          )}
          {payment?.status === "failed" && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800">
              Payment failed. Try again.
            </div>
          )}
        </div>

        {/* Confetti animation when completed */}
        {confetti && (
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="confetti c1" />
            <div className="confetti c2" />
            <div className="confetti c3" />
            <div className="confetti c4" />
            <div className="confetti c5" />
          </div>
        )}

        {/* Animations */}
        <style jsx global>{`
          @keyframes fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(80vh) rotate(360deg); opacity: 0; } }
          .confetti { position: absolute; width: 8px; height: 14px; opacity: 0; animation: fall 1s ease-in forwards; }
          .confetti.c1 { left: 20%; background: #22c55e; }
          .confetti.c2 { left: 35%; background: #3b82f6; animation-delay: .05s; }
          .confetti.c3 { left: 50%; background: #f59e0b; animation-delay: .1s; }
          .confetti.c4 { left: 65%; background: #ef4444; animation-delay: .15s; }
          .confetti.c5 { left: 80%; background: #8b5cf6; animation-delay: .2s; }
        `}</style>
      </div>
    </PortalLayout>
  );
}
