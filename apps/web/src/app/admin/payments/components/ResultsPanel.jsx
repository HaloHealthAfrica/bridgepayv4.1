export function ResultsPanel({ results, lastRunAt, resultsRef }) {
  return (
    <div
      ref={resultsRef}
      className="bg-white border border-slate-200 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          {results?.data?.ok === true ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Success
            </span>
          ) : results ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              No match found
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
              Ready
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {lastRunAt ? `Last run: ${new Date(lastRunAt).toLocaleString()}` : ""}
        </div>
      </div>

      {results?.data?.token && (
        <div className="mb-2 text-xs text-slate-600">
          token.status: {results.data.token.status}
        </div>
      )}

      {results && (
        <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
          <pre className="text-xs md:text-sm text-slate-800 font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(results.data, null, 2)}
          </pre>
        </div>
      )}

      {results?.data?.attempts && Array.isArray(results.data.attempts) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            Attempts
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-1 border-b border-slate-200">
                    method
                  </th>
                  <th className="px-2 py-1 border-b border-slate-200">
                    status
                  </th>
                  <th className="px-2 py-1 border-b border-slate-200">url</th>
                </tr>
              </thead>
              <tbody>
                {results.data.attempts.map((a, idx) => {
                  const shortUrl = String(a.url || "");
                  const displayUrl =
                    shortUrl.length > 64
                      ? shortUrl.slice(0, 64) + "…"
                      : shortUrl;
                  return (
                    <tr key={idx}>
                      <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                        {a.method}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                        {a.status}
                      </td>
                      <td
                        className="px-2 py-1 border-b border-slate-100 text-slate-700"
                        title={shortUrl}
                      >
                        {displayUrl}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results?.data?.error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {String(results.data.error)}
        </div>
      )}

      {results?.source === "payment" &&
        Array.isArray(results?.data?.transactions) &&
        results.data.transactions.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-slate-900 mb-2">
              History
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b border-slate-200">
                      When
                    </th>
                    <th className="px-2 py-1 border-b border-slate-200">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.data.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="px-2 py-1 border-b border-slate-100 text-slate-700">
                        {t.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
