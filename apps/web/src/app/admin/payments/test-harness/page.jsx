import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

export default function AdminPaymentsTestHarnessPage() {
  const { data: user, loading: userLoading } = useUser();
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [durationMs, setDurationMs] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    if (!userLoading && !user) {
      if (typeof window !== "undefined") {
        window.location.href = "/account/signin";
      }
    }
  }, [user, userLoading]);

  const runMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      setStartedAt(Date.now());
      const res = await fetch("/api/admin/payments/test-harness", {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Test harness failed [${res.status}] ${res.statusText} ${text}`,
        );
      }
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => {
      setReport(data?.report || null);
      setDurationMs(Date.now() - (startedAt || Date.now()));
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 50);
    },
    onError: (e) => {
      console.error(e);
      setError(e?.message || "Run failed");
      setDurationMs(null);
    },
  });

  const busy = runMutation.isPending;

  // helper to anchor-link step names
  const stepAnchor = (step, idx) => {
    const slug = (step?.name || `step-${idx}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `step-${idx}-${slug}`;
  };

  const StepBlock = ({ step, idx }) => {
    const pass = step?.pass;
    const anchorId = stepAnchor(step, idx);
    return (
      <div
        id={anchorId}
        className={`border rounded-lg p-4 ${pass ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-slate-800 uppercase">
            {step?.name}
          </div>
          <div
            className={`text-sm ${pass ? "text-green-700" : "text-red-700"}`}
          >
            {pass ? "PASS" : "FAIL"}
          </div>
        </div>
        <pre className="text-xs overflow-auto bg-white border border-slate-200 rounded p-3 max-h-[300px] whitespace-pre-wrap">
          {JSON.stringify(step, null, 2)}
        </pre>
        <div className="mt-2 text-right">
          <a
            href="#top"
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            Back to top
          </a>
        </div>
      </div>
    );
  };

  // summary + links to each step
  const StepsIndex = ({ steps }) => {
    if (!steps?.length) return null;
    const passCount = steps.filter((s) => s?.pass).length;
    const total = steps.length;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4" id="top">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-slate-900">Run Summary</div>
          <div className="text-sm text-slate-700">
            {passCount}/{total} passed
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {steps.map((s, idx) => {
            const href = `#${stepAnchor(s, idx)}`;
            const pass = s?.pass;
            return (
              <a
                key={idx}
                href={href}
                className={`flex items-center justify-between border rounded px-3 py-2 text-sm ${pass ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-red-300 bg-red-50 hover:bg-red-100"}`}
              >
                <span className="truncate pr-2">{s?.name}</span>
                <span
                  className={`text-xs ${pass ? "text-green-700" : "text-red-700"}`}
                >
                  {pass ? "PASS" : "FAIL"}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            Payments Test Harness
          </h1>
          <a
            href="/admin/payments"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Back
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <p className="text-slate-800 mb-4">
            Run the full V0 payment validation suite directly on this server.
            This uses internal API calls and SQL checks. Admin only.
          </p>
          {error && (
            <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
          )}
          <button
            className={`px-4 py-2 rounded text-white ${busy ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800"}`}
            disabled={busy}
            onClick={() => runMutation.mutate()}
          >
            {busy ? "Running..." : "Run Test Suite"}
          </button>
          {durationMs != null && (
            <div className="mt-2 text-sm text-slate-600">
              Duration: {Math.round(durationMs / 1000)}s
            </div>
          )}
        </div>

        {/* New summary/index with links to each step */}
        {report?.steps?.length ? (
          <div className="mb-6">
            <StepsIndex steps={report.steps} />
          </div>
        ) : null}

        {report && (
          <div ref={resultsRef} className="grid grid-cols-1 gap-6">
            {(report.steps || []).map((s, idx) => (
              <StepBlock key={idx} step={s} idx={idx} />
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .font-inter {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
            "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
            "Helvetica Neue", sans-serif;
        }
      `}</style>
    </div>
  );
}
