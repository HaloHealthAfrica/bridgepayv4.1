import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import {
  Folder,
  CalendarDays,
  Plus,
  Grid as GridIcon,
  List as ListIcon,
  Kanban as KanbanIcon,
  Filter as FilterIcon,
  Clock,
  CheckCircle,
  DollarSign,
  MoreHorizontal,
} from "lucide-react";

const statusColors = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-[#E6F0FF] text-[#1e40af]",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function ProjectsPage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("grid"); // grid | list | kanban (future)
  const [showCreate, setShowCreate] = useState(false);
  const [formError, setFormError] = useState(null);

  const queryClient = useQueryClient();

  // Load projects
  const projectsQuery = useQuery({
    queryKey: ["projects", status, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (q) params.set("q", q);
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        throw new Error(
          `When fetching /api/projects, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const items = projectsQuery.data?.items || [];
  const totals = useMemo(() => {
    const all = items.length;
    const inProgress = items.filter((p) => p.status === "active").length;
    const completed = items.filter((p) => p.status === "completed").length;
    const revenue = items.reduce(
      (sum, p) => sum + (Number(p.current_amount) || 0),
      0,
    );
    return { all, inProgress, completed, revenue };
  }, [items]);

  const formatCurrency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "KES",
    }).format(Number(n || 0));

  // Create project mutation (MVP)
  const createProject = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(
          `When creating project, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: () => {
      setShowCreate(false);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err) => {
      console.error(err);
      setFormError("Could not create project. Please try again.");
    },
  });

  // Derived counts for tabs
  const allCount = totals.all;
  const activeCount = items.filter((p) => p.status === "active").length;
  const completedCount = items.filter((p) => p.status === "completed").length;
  const onHoldCount = items.filter((p) => p.status === "cancelled").length; // mapping "On Hold" to cancelled for now
  const archivedCount = 0; // placeholder

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-500">
              Manage and track all your projects in one place
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects..."
              className="px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] w-full md:w-[260px]"
            />
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] text-white px-3 py-2 text-sm hover:bg-[#1d4fd8] transition-colors"
            >
              <Plus size={16} /> New Project
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            className="card p-4 transition-shadow"
            style={{
              boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.12))",
            }}
          >
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Folder size={16} /> Total Projects
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {allCount}
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              +12% from last month
            </div>
          </div>
          <div
            className="card p-4 transition-shadow"
            style={{
              boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.12))",
            }}
          >
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Clock size={16} /> In Progress
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {activeCount}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              {allCount ? Math.round((activeCount / allCount) * 100) : 0}% of
              total
            </div>
          </div>
          <div
            className="card p-4 transition-shadow"
            style={{
              boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.12))",
            }}
          >
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <CheckCircle size={16} /> Completed
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {completedCount}
            </div>
            <div className="text-xs text-emerald-600 mt-1">This month: 3</div>
          </div>
          <div
            className="card p-4 transition-shadow"
            style={{
              boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.12))",
            }}
          >
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <DollarSign size={16} /> Total Value
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">
              {formatCurrency(totals.revenue)}
            </div>
            <div className="text-xs text-[#8B5CF6] mt-1">
              +KES 12,000 this week
            </div>
          </div>
        </div>

        {/* Filter & View Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { v: "all", label: `All Projects (${allCount})` },
              { v: "active", label: `Active (${activeCount})` },
              { v: "completed", label: `Completed (${completedCount})` },
              { v: "cancelled", label: `On Hold (${onHoldCount})` },
              { v: "archived", label: `Archived (${archivedCount})` },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setStatus(t.v)}
                className={`px-3 py-2 rounded-md border text-sm ${status === t.v ? "border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* View + Sort (basic MVP) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView("grid")}
                className={`p-2 rounded-md border ${view === "grid" ? "border-[#2563EB] text-[#2563EB] bg-[rgba(37,99,235,0.06)]" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                aria-label="Grid view"
              >
                <GridIcon size={16} />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-2 rounded-md border border-slate-200 text-slate-400 cursor-not-allowed"
                aria-disabled
                title="List view coming soon"
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() => setView("kanban")}
                className="p-2 rounded-md border border-slate-200 text-slate-400 cursor-not-allowed"
                aria-disabled
                title="Kanban coming soon"
              >
                <KanbanIcon size={16} />
              </button>
            </div>
            <button className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-100">
              <FilterIcon size={16} /> Filters
            </button>
          </div>
        </div>

        {/* Views */}
        {projectsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="card h-[220px] animate-pulse bg-slate-100"
              />
            ))}
          </div>
        ) : projectsQuery.error ? (
          <div className="text-sm text-slate-600">Could not load projects.</div>
        ) : items.length === 0 ? (
          // Enhanced Empty State
          <div className="card p-8 text-center">
            <div className="mx-auto w-[120px] h-[120px] rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Folder className="text-slate-400" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              No projects yet
            </h3>
            <p className="text-slate-500 mt-1">
              Start your first project to organize work, track progress, and
              collaborate.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] text-white px-4 py-2 text-sm hover:bg-[#1d4fd8] transition-colors"
              >
                <Plus size={16} /> Create Your First Project
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 text-slate-700 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                disabled
                title="Import coming soon"
              >
                Import Projects
              </button>
            </div>
            <div className="mt-8">
              <p className="text-sm text-slate-500 mb-3">
                Or start with a template:
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                {[
                  { emoji: "🚀", title: "Product Launch" },
                  { emoji: "💼", title: "Client Project" },
                  { emoji: "📱", title: "App Development" },
                ].map((t) => (
                  <div
                    key={t.title}
                    className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-600"
                  >
                    <div className="text-lg">{t.emoji}</div>
                    <div className="mt-1">{t.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => {
              const pct = Math.min(
                100,
                Math.round(
                  ((Number(p.current_amount) || 0) /
                    Math.max(1, Number(p.target_amount) || 1)) *
                    100,
                ),
              );
              return (
                <div
                  key={p.id}
                  className="card overflow-hidden transition-transform duration-200 hover:shadow-lg hover:-translate-y-[2px]"
                  style={{ borderRadius: "12px" }}
                >
                  {/* Cover */}
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt="cover"
                      className="w-full h-[120px] object-cover"
                    />
                  ) : (
                    <div className="w-full h-[120px] bg-slate-100 flex items-center justify-center text-slate-400">
                      <Folder size={24} />
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <a
                          href={`/projects/${p.id}`}
                          className="font-medium text-slate-900 line-clamp-1 hover:underline"
                        >
                          {p.title}
                        </a>
                        <div className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {p.description || ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${statusColors[p.status] || "bg-slate-100 text-slate-700"}`}
                        >
                          {p.status}
                        </span>
                        <button
                          className="p-1 text-slate-500 hover:text-slate-700"
                          title="More actions"
                          aria-label="More actions"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2563EB]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-slate-500">Raised</div>
                        <div className="font-medium">
                          {formatCurrency(p.current_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Target</div>
                        <div className="font-medium">
                          {formatCurrency(p.target_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Due</div>
                        <div className="font-medium flex items-center gap-1">
                          <CalendarDays size={14} /> {p.deadline || "—"}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100">
                          {p.category || "General"}
                        </span>
                        {p.location ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100">
                            {p.location}
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={`/projects/${p.id}`}
                        className="text-[#2563EB] text-sm hover:underline"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal (MVP) */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => {
            setShowCreate(false);
            setFormError(null);
          }}
          onCreate={(payload) => createProject.mutate(payload)}
          loading={createProject.isLoading}
          error={formError}
        />
      )}
    </PortalLayout>
  );
}

// Simple modal inside this file for MVP
function CreateProjectModal({ onClose, onCreate, loading, error }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [cover, setCover] = useState("");
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    setLocalError(null);
  }, [title, target]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // basic validation
    if (!title || title.trim().length < 3) {
      setLocalError("Title must be at least 3 characters");
      return;
    }
    const ta = Number(target);
    if (Number.isNaN(ta) || ta < 0) {
      setLocalError(
        "Target amount must be a number greater than or equal to 0",
      );
      return;
    }

    onCreate({
      title: title.trim(),
      description: description || undefined,
      target_amount: ta,
      currency: currency || "KES",
      deadline: deadline || undefined,
      category: category || undefined,
      location: location || undefined,
      cover_image_url: cover || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-[10%] mx-auto w-[95%] md:w-[720px]">
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              New Project
            </h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="Project title"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">
                  Target Amount *
                </label>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="e.g. 5000"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Currency</label>
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="KES"
                  maxLength={3}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Category</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="e.g. Education"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  placeholder="e.g. Nairobi"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                placeholder="Describe the project"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Cover Image URL</label>
              <input
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                placeholder="https://..."
              />
            </div>
            {(error || localError) && (
              <div className="text-sm text-rose-600">{error || localError}</div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-md border border-slate-300 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-2 rounded-md bg-[#2563EB] text-white text-sm hover:bg-[#1d4fd8] disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
