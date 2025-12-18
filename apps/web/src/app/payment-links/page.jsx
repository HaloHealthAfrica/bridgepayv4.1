import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import { Link } from "react-router";
import {
  Plus,
  Copy,
  ExternalLink,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function PaymentLinksPage() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(null);

  const linksQuery = useQuery({
    queryKey: ["payment-links", cursor],
    queryFn: async () => {
      const url = new URL("/api/payment-links", window.location.origin);
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", "20");
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch payment links: ${res.statusText}`);
      }
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/payment-links/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete payment link");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-links"] });
      toast.success("Payment link cancelled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel payment link");
    },
  });

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "KES",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return <CheckCircle size={16} className="text-emerald-600" />;
      case "cancelled":
      case "expired":
        return <XCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
      case "expired":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const links = linksQuery.data?.items || [];
  const pagination = linksQuery.data?.pagination;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payment Links</h1>
            <p className="text-slate-600 mt-1">
              Create and share payment links with customers
            </p>
          </div>
          <Link
            to="/payment-links/create"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Create Link
          </Link>
        </div>

        {linksQuery.isLoading ? (
          <div className="card p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          </div>
        ) : linksQuery.error ? (
          <div className="card p-6">
            <div className="text-red-600">
              Failed to load payment links: {linksQuery.error.message}
            </div>
          </div>
        ) : links.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600 mb-4">No payment links yet</p>
            <Link to="/payment-links/create" className="btn-primary inline-flex">
              <Plus size={16} /> Create Your First Link
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {links.map((link) => (
                <div key={link.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {formatCurrency(link.amount, link.currency)}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${getStatusColor(link.status)}`}
                        >
                          {getStatusIcon(link.status)}
                          {link.status}
                        </span>
                      </div>
                      {link.description && (
                        <p className="text-sm text-slate-600 mb-2">
                          {link.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Code: {link.code}</span>
                        {link.expires_at && (
                          <span>
                            Expires: {new Date(link.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        <span>
                          Created: {new Date(link.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {link.status === "active" && (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={link.url}
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-slate-50"
                          />
                          <button
                            onClick={() => copyLink(link.url)}
                            className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-100 flex items-center gap-1 text-sm"
                          >
                            <Copy size={14} /> Copy
                          </button>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-100 flex items-center gap-1 text-sm"
                          >
                            <ExternalLink size={14} /> Open
                          </a>
                        </div>
                      )}
                    </div>
                    {link.status === "active" && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to cancel this payment link?"
                            )
                          ) {
                            deleteMutation.mutate(link.id);
                          }
                        }}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Cancel link"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {pagination?.hasMore && (
              <div className="text-center">
                <button
                  onClick={() => setCursor(pagination.cursor)}
                  className="btn-secondary"
                  disabled={linksQuery.isFetching}
                >
                  {linksQuery.isFetching ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  );
}
