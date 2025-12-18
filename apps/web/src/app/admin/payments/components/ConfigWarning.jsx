export function ConfigWarning({ probeData }) {
  if (probeData?.directConfigured || probeData?.relayConfigured) {
    return null;
  }

  return (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm">
      No provider config found. Set LEMONADE_CONSUMER_KEY and
      LEMONADE_CONSUMER_SECRET. Relay is optional.
    </div>
  );
}
