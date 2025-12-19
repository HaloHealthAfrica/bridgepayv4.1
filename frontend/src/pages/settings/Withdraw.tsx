import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Phone } from "lucide-react";
import { walletAPI } from "../../services/api";
import { PrimaryButton } from "../../components/ui/Buttons";

export function Withdraw() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const fee = useMemo(() => Math.min((Number(amount || 0) || 0) * 0.01, 50), [amount]);
  const total = useMemo(() => (Number(amount || 0) || 0) + fee, [amount, fee]);

  const onWithdraw = async () => {
    if (!phone) return alert("Phone required");
    if (Number(amount) < 10) return alert("Minimum withdrawal is KES 10");

    setLoading(true);
    try {
      await walletAPI.withdrawMpesa({ phone, amount: Number(amount) });
      alert("Withdrawal initiated. You will receive M-Pesa shortly.");
      navigate("/wallet");
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button type="button" onClick={() => navigate("/settings")} className="text-primary font-semibold mb-4 hover:underline">
        ← Back to Settings
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Withdraw Funds</h1>
        <p className="text-text-secondary">Transfer money to your M-Pesa</p>
      </div>

      <div className="bg-gradient-to-br from-primary to-primary-dark rounded-card p-8 text-white text-center mb-6">
        <div className="text-sm opacity-90 mb-2">Withdraw to M-Pesa</div>
        <div className="text-xs opacity-80">Fee: 1% (max KES 50)</div>
      </div>

      <div className="bg-surface rounded-card p-6 border border-gray-200">
        <div className="mb-5">
          <label className="block mb-2 font-semibold">M-Pesa Phone Number</label>
          <div className="flex gap-3 items-center">
            <Phone className="text-primary" />
            <input className="w-full p-4 border-2 border-gray-200 rounded-button bg-surface" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0722 123 456" />
          </div>
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold">Amount (KES)</label>
          <input className="w-full p-4 text-2xl font-extrabold border-2 border-gray-200 rounded-button bg-surface" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Enter amount" />
        </div>

        <div className="bg-primary-light rounded-card p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Withdrawal Amount</span>
            <span className="font-semibold">KES {(Number(amount || 0) || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-text-secondary">Transaction Fee (1%)</span>
            <span className="font-semibold">KES {fee.toLocaleString()}</span>
          </div>
          <div className="h-px bg-primary/20 my-3" />
          <div className="flex justify-between text-lg font-extrabold text-primary">
            <span>Total Deducted</span>
            <span>KES {total.toLocaleString()}</span>
          </div>
        </div>

        <PrimaryButton icon={Download} fullWidth onClick={onWithdraw} disabled={loading}>
          {loading ? "Processing..." : "Withdraw to M-Pesa"}
        </PrimaryButton>
      </div>
    </div>
  );
}


