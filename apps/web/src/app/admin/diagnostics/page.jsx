import { useState, useEffect } from "react";
import useUser from "@/utils/useUser";

export default function DiagnosticsPage() {
  const { data: user, loading: userLoading } = useUser();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  // Redirect if not signed in
  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = "/account/signin";
    }
  }, [user, userLoading]);

  const handleApiCall = async (endpoint, key, description) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        [key]: {
          success: true,
          data,
          description,
        },
      }));
    } catch (error) {
      console.error(`${description} error:`, error);
      setResults((prev) => ({
        ...prev,
        [key]: {
          success: false,
          error: error.message,
          description,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCheckSecrets = async () => {
    setLoading((prev) => ({ ...prev, secrets: true }));
    try {
      const response = await fetch("/api/debug/secrets");
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        secrets: {
          success: true,
          data,
          description: "Lemonade Secrets Check",
        },
      }));
    } catch (error) {
      console.error("Secrets check error:", error);
      setResults((prev) => ({
        ...prev,
        secrets: {
          success: false,
          error: error.message,
          description: "Lemonade Secrets Check",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, secrets: false }));
    }
  };

  const handleLemonadeTrace = async () => {
    setLoading((prev) => ({ ...prev, lemonade: true }));
    try {
      // First test the GET endpoint (capability probe)
      const response = await fetch("/api/payments/lemonade/trace");
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        lemonade: {
          success: true,
          data,
          description: "Lemonade Integration Test",
        },
      }));
    } catch (error) {
      console.error("Lemonade trace error:", error);
      setResults((prev) => ({
        ...prev,
        lemonade: {
          success: false,
          error: error.message,
          description: "Lemonade Integration Test",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, lemonade: false }));
    }
  };

  // NEW: webhook metrics snapshot
  const handleWebhookSnapshot = async () => {
    setLoading((prev) => ({ ...prev, webhookSnapshot: true }));
    try {
      const response = await fetch("/api/admin/metrics/overview");
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        webhookSnapshot: {
          success: true,
          data,
          description: "Webhook Metrics Snapshot",
        },
      }));
    } catch (error) {
      console.error("Webhook snapshot error:", error);
      setResults((prev) => ({
        ...prev,
        webhookSnapshot: {
          success: false,
          error: error.message,
          description: "Webhook Metrics Snapshot",
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, webhookSnapshot: false }));
    }
  };

  if (userLoading) {
    return (
      <div className="font-inter min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="font-inter min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-semibold text-slate-900">
                  Bridge MVP
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-8">
              <a
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/account/logout"
                className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium"
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Admin Diagnostics
          </h2>

          {/* Action Buttons */}
          <div className="space-y-4 mb-8">
            <button
              onClick={() =>
                handleApiCall("/api/health", "health", "Health Check")
              }
              disabled={loading.health}
              className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {loading.health ? "Checking..." : "Ping Health"}
            </button>

            <button
              onClick={() =>
                handleApiCall("/api/debug/session", "session", "Session Check")
              }
              disabled={loading.session}
              className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:opacity-50 text-sm font-medium transition-colors ml-0 md:ml-4"
            >
              {loading.session ? "Checking..." : "Check Session"}
            </button>

            <button
              onClick={handleCheckSecrets}
              disabled={loading.secrets}
              className="w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50 text-sm font-medium transition-colors ml-0 md:ml-4"
            >
              {loading.secrets ? "Checking..." : "Check Secrets"}
            </button>

            <button
              onClick={handleLemonadeTrace}
              disabled={loading.lemonade}
              className="w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:opacity-50 text-sm font-medium transition-colors ml-0 md:ml-4"
            >
              {loading.lemonade ? "Checking..." : "Test Lemonade"}
            </button>

            {/* NEW: Webhook Snapshot */}
            <button
              onClick={handleWebhookSnapshot}
              disabled={loading.webhookSnapshot}
              className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50 text-sm font-medium transition-colors ml-0 md:ml-4"
            >
              {loading.webhookSnapshot ? "Checking..." : "Webhook Snapshot"}
            </button>
          </div>

          {/* Results Display */}
          {Object.keys(results).length > 0 && (
            <div className="space-y-6">
              {Object.entries(results).map(([key, result]) => (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    {result.description}
                  </h3>

                  <div className="bg-slate-50 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-700 font-mono">
                      {result.success
                        ? JSON.stringify(result.data, null, 2)
                        : `Error: ${result.error}`}
                    </pre>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.success
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.success ? "Success" : "Failed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(results).length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600">
                Click the buttons above to run diagnostics and see the results
                here.
              </p>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </div>
  );
}
