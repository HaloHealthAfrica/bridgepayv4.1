import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { walletAPI } from "../../services/api";
import { PrimaryButton } from "../../components/ui/Buttons";

export function SendMoney() {
  const navigate = useNavigate();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fee = 0;
  const total = useMemo(() => (Number(amount || 0) || 0) + fee, [amount]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone) return alert("Recipient required");
    if (Number(amount) < 1) return alert("Minimum transfer is KES 1");

    setLoading(true);
    try {
      await walletAPI.transfer({ recipientPhone, amount: Number(amount), note: note || undefined });
      alert("Transfer successful!");
      navigate("/wallet");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <button type="button" onClick={() => navigate("/wallet")} className="text-primary font-semibold mb-4 hover:underline">
          ← Back to Wallet
        </button>
        <h1 className="text-3xl font-bold mb-2">Send Money</h1>
        <p className="text-text-secondary">Transfer to any Bridge wallet</p>
      </div>

      <form onSubmit={onSubmit} className="bg-surface rounded-card p-6 border border-gray-200">
        <div className="mb-6">
          <label className="block mb-2 font-semibold">Recipient</label>
          <input
            type="text"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
            placeholder="Phone number (e.g. 0722...)"
            className="w-full p-4 border-2 border-gray-200 rounded-button bg-surface"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">Amount (KES)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full p-4 text-2xl font-extrabold border-2 border-gray-200 rounded-button bg-surface"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold">Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's this for?"
            className="w-full p-4 border-2 border-gray-200 rounded-button bg-surface"
          />
        </div>

        <div className="bg-primary-light rounded-button p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Transfer Fee</span>
            <span className="font-semibold">KES {fee}</span>
          </div>
          <div className="flex justify-between text-lg font-extrabold text-primary">
            <span>Total</span>
            <span>KES {total.toLocaleString()}</span>
          </div>
        </div>

        <PrimaryButton type="submit" icon={ArrowUpRight} fullWidth disabled={loading}>
          {loading ? "Sending..." : "Send Money"}
        </PrimaryButton>
      </form>
    </div>
  );
}


