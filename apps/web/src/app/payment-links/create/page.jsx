import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import PortalLayout from "@/components/PortalLayout";
import CurrencySelector from "@/components/CurrencySelector";
import { toast } from "sonner";

export default function CreatePaymentLinkPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: "",
    currency: "KES",
    description: "",
    expiresIn: "", // days
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const body = {
        amount: Number(data.amount),
        currency: data.currency,
        description: data.description || null,
      };

      if (data.expiresIn) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(data.expiresIn));
        body.expires_at = expiresAt.toISOString();
      }

      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create payment link");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Payment link created successfully!");
      navigate(`/payment-links`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create payment link");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Payment Link</h1>
          <p className="text-slate-600 mt-1">
            Generate a shareable link for customers to pay you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Currency *
            </label>
            <CurrencySelector
              value={formData.currency}
              onChange={(currency) =>
                setFormData({ ...formData, currency })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              rows={3}
              placeholder="Payment for..."
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expires In (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.expiresIn}
              onChange={(e) =>
                setFormData({ ...formData, expiresIn: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              placeholder="Leave empty for no expiration"
            />
            <p className="text-xs text-slate-500 mt-1">
              Link will expire after the specified number of days
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={createMutation.isLoading}
              className="btn-primary flex-1"
            >
              {createMutation.isLoading ? "Creating..." : "Create Payment Link"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/payment-links")}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
