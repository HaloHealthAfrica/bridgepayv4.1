"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import PortalLayout from "@/components/PortalLayout";
import {
  ArrowLeft,
  DollarSign,
  CalendarDays,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  Heart,
} from "lucide-react";
import { useState } from "react";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showContribute, setShowContribute] = useState(false);

  // Fetch project
  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to load project");
      return res.json();
    },
  });

  // Fetch contributions
  const contributionsQuery = useQuery({
    queryKey: ["project-contributions", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/contributions`);
      if (!res.ok) throw new Error("Failed to load contributions");
      return res.json();
    },
  });

  const project = projectQuery.data?.data;
  const contributions = contributionsQuery.data?.data?.items || [];

  const formatCurrency = (n, currency = "KES") =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(Number(n || 0));

  if (projectQuery.isLoading) {
    return (
      <PortalLayout>
        <div className="p-6">Loading project...</div>
      </PortalLayout>
    );
  }

  if (projectQuery.error || !project) {
    return (
      <PortalLayout>
        <div className="p-6 text-red-600">Failed to load project</div>
      </PortalLayout>
    );
  }

  const progressPercent = project.progressPercent || 0;
  const isActive = project.status === "active";
  const isCompleted = project.status === "completed";

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>

        {/* Project Header */}
        <div className="card overflow-hidden">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-slate-100 flex items-center justify-center">
              <span className="text-slate-400">No cover image</span>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {project.title}
                </h1>
                {project.description && (
                  <p className="text-slate-600">{project.description}</p>
                )}
              </div>
              <span
                className={`badge ${
                  isCompleted
                    ? "bg-emerald-50 text-emerald-700"
                    : isActive
                      ? "bg-[#E6F0FF] text-[#1e40af]"
                      : "bg-slate-100 text-slate-700"
                }`}
              >
                {project.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">Progress</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563EB] transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(project.currentAmount, project.currency)}
                </div>
                <div className="text-sm text-slate-600 mt-1">Raised</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(project.targetAmount, project.currency)}
                </div>
                <div className="text-sm text-slate-600 mt-1">Target</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">
                  {project.contributionCount || 0}
                </div>
                <div className="text-sm text-slate-600 mt-1">Contributors</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-1">
                  <CalendarDays size={20} />
                  {project.deadline || "—"}
                </div>
                <div className="text-sm text-slate-600 mt-1">Deadline</div>
              </div>
            </div>

            {/* Contribute Button */}
            {isActive && (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setShowContribute(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] text-white px-6 py-3 text-lg font-semibold hover:bg-[#1d4fd8] transition-colors"
                >
                  <Heart size={20} /> Contribute Now
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <CheckCircle className="mx-auto text-emerald-600 mb-2" size={24} />
                <p className="text-emerald-700 font-semibold">
                  Project goal reached!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contributions List */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Contributions</h2>
          {contributions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              No contributions yet. Be the first!
            </p>
          ) : (
            <div className="space-y-3">
              {contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-semibold">
                      {contribution.contributor?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="font-medium">
                        {contribution.anonymous
                          ? "Anonymous"
                          : contribution.contributor?.name || "Anonymous"}
                      </div>
                      {contribution.message && (
                        <div className="text-sm text-slate-600">
                          {contribution.message}
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        {new Date(contribution.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(contribution.amount, contribution.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contribute Modal */}
      {showContribute && (
        <ContributeModal
          project={project}
          onClose={() => setShowContribute(false)}
          onSuccess={() => {
            setShowContribute(false);
            queryClient.invalidateQueries({ queryKey: ["project", id] });
            queryClient.invalidateQueries({ queryKey: ["project-contributions", id] });
          }}
        />
      )}
    </PortalLayout>
  );
}

function ContributeModal({ project, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState(null);

  const contributeMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/projects/${project.id}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to contribute");
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Redirect to payment intent confirmation
      navigate(`/payments/intent/${data.data.paymentIntentId}`);
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    contributeMutation.mutate({
      amount: amountNum,
      currency: project.currency || "KES",
      message: message || undefined,
      anonymous,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-[10%] mx-auto w-[95%] md:w-[500px]">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Contribute to Project</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount ({project.currency || "KES"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                rows={3}
                placeholder="Leave a message with your contribution"
                maxLength={500}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="anonymous" className="text-sm text-slate-700">
                Contribute anonymously
              </label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={contributeMutation.isPending}
                className="px-4 py-2 bg-[#2563EB] text-white rounded-md hover:bg-[#1d4fd8] disabled:opacity-60"
              >
                {contributeMutation.isPending ? "Processing..." : "Continue to Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

