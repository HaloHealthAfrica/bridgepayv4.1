import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { walletAPI } from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import { TransactionRow, type UITransaction } from "../../components/wallet/TransactionRow";
import { TransactionDetailModal } from "../../components/wallet/TransactionDetailModal";

type BackendTransaction = any;

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function mapTx(meId: string, tx: BackendTransaction): UITransaction & { backendId: string } {
  const isReceive = tx.toUserId === meId;
  const direction: UITransaction["direction"] = isReceive ? "receive" : "send";
  let title = tx.description || tx.type;
  if (tx.type === "TRANSFER" || tx.type === "PAYMENT" || tx.type === "ESCROW_RELEASE") {
    if (direction === "receive") title = `Payment from ${tx.fromUser?.name || "Someone"}`;
    else title = `Send to ${tx.toUser?.name || "Someone"}`;
  }
  return {
    backendId: tx.id,
    id: String(tx.id),
    direction,
    title,
    amount: Number(tx.amount),
    dateLabel: tx.createdAt ? timeAgo(tx.createdAt) : "",
    status: tx.status,
  };
}

export function History() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const meId = user?.id || "";

  const [txs, setTxs] = useState<BackendTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<(UITransaction & { backendId: string }) | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const txRes = await walletAPI.getTransactions({ page: 1, limit: 50 });
        setTxs(txRes.data.data.transactions || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const uiTxs = useMemo(() => (meId ? txs.map((t) => mapTx(meId, t)) : []), [meId, txs]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button type="button" onClick={() => navigate("/wallet")} className="text-primary font-semibold mb-4 hover:underline">
          ← Back to Wallet
        </button>
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-text-secondary">All your money movements</p>
      </div>

      <div className="bg-surface rounded-card p-6 border border-gray-200">
        {loading ? (
          <div>Loading...</div>
        ) : uiTxs.length === 0 ? (
          <div className="text-text-secondary">No transactions yet.</div>
        ) : (
          uiTxs.map((t) => <TransactionRow key={t.id} transaction={t} onClick={() => setSelected(t)} />)
        )}
      </div>

      {selected ? (
        <TransactionDetailModal
          transaction={selected}
          onClose={() => setSelected(null)}
          onReceipt={async () => {
            try {
              const res = await walletAPI.createReceipt(selected.backendId);
              const url = res.data.data.receiptUrl;
              if (url) window.open(url, "_blank");
              else alert("Receipt not available (S3 not configured).");
            } catch (e: any) {
              alert(e?.response?.data?.error?.message || "Failed to generate receipt");
            }
          }}
        />
      ) : null}
    </div>
  );
}


