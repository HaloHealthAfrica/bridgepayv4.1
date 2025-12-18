import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, Calendar, FileText, Loader } from "lucide-react";
import { toast } from "sonner";

export default function PaymentLinkPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");

  const linkQuery = useQuery({
    queryKey: ["payment-link-public", code],
    queryFn: async () => {
      const res = await fetch(`/api/payment-links/${code}/public`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Payment link not found");
      }
      return res.json();
    },
    retry: false,
  });

  const payMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/payment-links/${code}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Payment failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      navigate(`/pay/success/${data.payment_id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Payment failed");
    },
  });

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePay = (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }
    payMutation.mutate({ method: "stk", phone_number: phone });
  };

  if (linkQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (linkQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Payment Link Error</h2>
          <p className="text-slate-600">{linkQuery.error?.message || "Payment link not found"}</p>
        </div>
      </div>
    );
  }

  const link = linkQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E6F0FF] rounded-full mb-4">
            <DollarSign className="w-8 h-8 text-[#2563EB]" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Payment Request</h1>
          {link.description && (
            <p className="text-slate-600">{link.description}</p>
          )}
        </div>

        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-1">Amount</p>
            <p className="text-3xl font-bold text-slate-900">
              {formatCurrency(link.amount, link.currency)}
            </p>
          </div>
        </div>

        {link.expires_at && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
            <Calendar className="w-4 h-4" />
            <span>Expires: {new Date(link.expires_at).toLocaleString()}</span>
          </div>
        )}

        <form onSubmit={handlePay} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="254712345678"
              required
            />
          </div>

          <button
            type="submit"
            disabled={payMutation.isLoading}
            className="w-full px-4 py-3 bg-[#2563EB] text-white rounded-lg hover:bg-[#1e40af] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {payMutation.isLoading ? "Processing..." : "Pay Now"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-3 h-3" />
            <span>Secure payment powered by Bridge</span>
          </div>
        </div>
      </div>
    </div>
  );
}

