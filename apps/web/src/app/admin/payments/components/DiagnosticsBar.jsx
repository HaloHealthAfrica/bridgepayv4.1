export function DiagnosticsBar({
  probeData,
  onConnectivityCheck,
  onRelayRediscover,
  onForceDirect,
}) {
  const relayOn = !!probeData?.relayConfigured;
  const preferred = !!probeData?.preferRelay;
  const strategyDiscovered = !!probeData?.relayStrategy?.discovered;
  const breakerOpen = probeData?.relayBreaker?.state === "open";
  return (
    <div className="mb-4 flex flex-col md:flex-row md:items-center md:space-x-3 space-y-2 md:space-y-0">
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${probeData?.directConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
      >
        Direct: {probeData?.directConfigured ? "On" : "Off"}
      </span>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${relayOn ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
      >
        Relay: {relayOn ? "On" : "Off"}
      </span>
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
        Base: {probeData?.base || "—"}
      </span>

      {/* Relay panel bits */}
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${preferred ? "bg-green-50 text-green-800" : "bg-slate-100 text-slate-700"}`}
      >
        Preferred: {preferred ? "On" : "Off"}
      </span>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${strategyDiscovered ? "bg-green-50 text-green-800" : "bg-yellow-50 text-yellow-800"}`}
      >
        Strategy: {strategyDiscovered ? "Discovered" : "Not Discovered"}
      </span>
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${breakerOpen ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}
      >
        Breaker: {breakerOpen ? "Open" : "Closed"}
      </span>

      <div className="mt-2 md:mt-0 md:ml-auto flex gap-2">
        <button
          onClick={onConnectivityCheck}
          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900"
        >
          Connectivity Check
        </button>
        {/* Allow re-discover even when relay is currently off so discovery can run */}
        <button
          onClick={onRelayRediscover}
          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Re-discover Relay
        </button>
        <button
          onClick={onForceDirect}
          className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-orange-500 text-white hover:bg-orange-600"
        >
          Force Direct (2m)
        </button>
      </div>
    </div>
  );
}
