import { useState, useEffect } from "react";
import useAuth from "@/utils/useAuth";
import useUser from "@/utils/useUser";

export default function SignInPage() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { signInWithCredentials } = useAuth();
  const { data: user, loading: userLoading } = useUser();

  // NEW: read ?error= from URL for friendly message
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlErr = sp.get("error");
      if (urlErr) {
        setError(decodeURIComponent(urlErr));
      }
    }
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (!userLoading && user) {
      window.location.href = "/dashboard";
    }
  }, [user, userLoading]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await signInWithCredentials({
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: true,
      });
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Wrong email or password");
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(40deg, #F9F6ED 0%, #F0F0F8 50%, #E7E9FB 100%)",
        }}
      >
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="font-inter min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(40deg, #F9F6ED 0%, #F0F0F8 50%, #E7E9FB 100%)",
      }}
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-6 text-center">
          Welcome Back
        </h1>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* NEW: top-level error from ?error= */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 text-[15px]"
              placeholder="john.doe@example.com"
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
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 px-4 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 text-[15px] font-medium transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <a
              href="/account/signup"
              className="text-slate-900 hover:text-slate-700 font-medium"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>

      <style jsx global>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
}
