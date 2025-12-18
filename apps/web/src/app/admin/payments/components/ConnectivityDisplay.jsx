export function ConnectivityDisplay({ connectivity }) {
  if (!connectivity) return null;

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">
        Connectivity
      </h3>
      <pre className="text-xs font-mono text-slate-800 bg-slate-50 rounded p-3 overflow-x-auto">
        {JSON.stringify(connectivity, null, 2)}
      </pre>
    </div>
  );
}
