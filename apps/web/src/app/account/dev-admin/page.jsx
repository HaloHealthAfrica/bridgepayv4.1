import { useEffect, useState } from "react";

export default function DevAdminPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("Admin User");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const env =
      process.env.NEXT_PUBLIC_CREATE_ENV ||
      process.env.ENV ||
      process.env.NODE_ENV;
    if (env === "production") {
      setDisabled(true);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (disabled) return;

    try {
      const res = await fetch("/api/auth/dev-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (res.status === 302) {
        // Redirect handled by browser if we follow it
        const loc = res.headers.get("Location") || "/dashboard";
        window.location.href = loc;
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to create admin");
      }
    } catch (err) {
      console.error("Dev admin create error", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Dev Admin</h1>
          <p className="text-slate-600 mt-2">Disabled in production.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
          Create Admin (Dev Only)
        </h1>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-[15px]"
              placeholder="Admin User"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-[15px]"
              placeholder="admin@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-[15px]"
              placeholder="Choose a password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 text-[15px] font-medium transition-colors"
          >
            {loading ? "Creating & signing in…" : "Create Admin & Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-4">
          Dev only. Never logs passwords. Uses secure cookies in production.
        </p>
      </div>
      <style jsx global>{`
        .font-inter { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; }
      `}</style>
    </div>
  );
}
