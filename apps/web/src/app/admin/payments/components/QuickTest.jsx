export function QuickTest({
  qtKind,
  setQtKind,
  qtAmount,
  setQtAmount,
  qtPhone,
  setQtPhone,
  qtWallet,
  setQtWallet,
  qtOrderRef,
  setQtOrderRef,
  qtPaymentId,
  setQtPaymentId,
  qtResult,
  busyQuick,
  onQuickSend,
  onQuickStatus,
  createPending,
  statusPending,
}) {
  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Test</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Kind
          </label>
          <select
            value={qtKind}
            onChange={(e) => setQtKind(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="stk_push">stk_push</option>
            <option value="wallet_payment">wallet_payment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            value={qtAmount}
            onChange={(e) => setQtAmount(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {qtKind === "stk_push" ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone
            </label>
            <input
              value={qtPhone}
              onChange={(e) => setQtPhone(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Wallet No
            </label>
            <input
              value={qtWallet}
              onChange={(e) => setQtWallet(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Order Ref
          </label>
          <input
            value={qtOrderRef}
            onChange={(e) => setQtOrderRef(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-3">
        <button
          onClick={onQuickSend}
          disabled={busyQuick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {busyQuick && createPending ? "Sending…" : "Send Payment"}
        </button>
        <input
          placeholder="payment_id"
          value={qtPaymentId}
          onChange={(e) => setQtPaymentId(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={onQuickStatus}
          disabled={busyQuick}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {busyQuick && statusPending ? "Checking…" : "Check Status"}
        </button>
      </div>
      {qtResult && (
        <div className="bg-slate-50 rounded-lg p-3 overflow-x-auto">
          <pre className="text-xs md:text-sm text-slate-800 font-mono whitespace-pre-wrap break-words">
            {JSON.stringify(qtResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
