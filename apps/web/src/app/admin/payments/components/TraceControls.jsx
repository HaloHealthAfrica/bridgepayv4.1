import { ACTIONS } from "../constants";

export function TraceControls({
  action,
  setAction,
  mode,
  setMode,
  payloadText,
  setPayloadText,
  error,
  running,
  relayConfigured,
  onRunTrace,
  onCheckStatus,
  onReset,
  onUseExample,
  onCopyCurl,
  lastCurl,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mode
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="auto">auto</option>
            <option value="direct">direct</option>
            {/* Allow selecting relay even if not yet configured; backend will attempt discovery */}
            <option value="relay">
              relay{!relayConfigured ? " (will discover)" : ""}
            </option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Payload (JSON)
        </label>
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          rows={16}
          className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono"
          placeholder="{}"
        />
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRunTrace}
          disabled={running}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Running…" : "Run Trace"}
        </button>
        <button
          onClick={onCheckStatus}
          disabled={running || action !== "transaction_status"}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {running ? "Checking…" : "Check Status"}
        </button>
        <button
          onClick={onReset}
          disabled={running}
          className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={onUseExample}
          disabled={running}
          className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Use example payload
        </button>
        <button
          onClick={onCopyCurl}
          disabled={!lastCurl}
          className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          Copy last request as cURL
        </button>
      </div>
    </div>
  );
}
