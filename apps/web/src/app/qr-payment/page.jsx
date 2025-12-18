import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import PortalLayout from "@/components/PortalLayout";
import useUpload from "@/utils/useUpload";
import {
  Camera,
  Upload,
  QrCode,
  Smartphone,
  Wallet,
  Loader2,
} from "lucide-react";

export default function QrPaymentPage() {
  const [amount, setAmount] = useState(100);
  const [desc, setDesc] = useState("");
  const [format, setFormat] = useState("svg");
  const [generated, setGenerated] = useState(null);
  const [phone, setPhone] = useState("");
  const [walletNo, setWalletNo] = useState("11391837");
  const [error, setError] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "pay",
          amount: Number(amount) || undefined,
          currency: "KES",
          metadata: { description: desc || undefined },
        }),
      });
      if (!res.ok) {
        throw new Error(
          `When fetching /api/qr/generate, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    onSuccess: (data) => setGenerated(data),
    onError: (e) => {
      console.error(e);
      setError("Could not generate QR");
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ method }) => {
      if (!generated?.code) return;
      const payload = { code: generated.code, method };
      if (method === "stk") payload.phone_number = phone;
      if (method === "wallet") payload.wallet_no = walletNo;
      const res = await fetch("/api/qr/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Pay failed [${res.status}]`);
      }
      return json;
    },
    onSuccess: (r) => {
      if (typeof window !== "undefined" && r?.payment_id) {
        window.location.href = `/pay/success/${r.payment_id}`;
      }
    },
    onError: (e) => {
      console.error(e);
      setError(String(e?.message || e));
    },
  });

  const QuickAmount = ({ v }) => (
    <button
      onClick={() => setAmount(v)}
      className="px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 text-sm"
    >
      KES {v}
    </button>
  );

  return (
    <PortalLayout>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Scan to Pay (placeholder UI) */}
        <div className="card p-4">
          <h2 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <Smartphone size={18} /> Scan to Pay
          </h2>
          <div className="rounded-xl border border-dashed border-slate-300 h-[260px] flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Camera className="mx-auto mb-2" />
              <div className="text-sm mb-2">
                Camera preview will appear here
              </div>
              <button className="btn-primary rounded-md px-4 py-2">
                Start Camera
              </button>
              <div className="mt-3 text-xs">or</div>
              <button className="mt-2 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-100 text-sm flex items-center gap-2 mx-auto">
                <Upload size={16} /> Upload QR Image
              </button>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-slate-500">Recent scans</div>
            <div className="text-xs text-slate-400">No recent scans</div>
          </div>
        </div>

        {/* Right: Generate QR */}
        <div className="card p-4">
          <h2 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
            <QrCode size={18} /> Generate QR Code
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
              <div className="flex items-center gap-2 mt-2">
                {[10, 25, 50, 100].map((v) => (
                  <QuickAmount key={v} v={v} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-primary rounded-md px-4 py-2 flex items-center gap-2"
            >
              {generateMutation.isPending && (
                <Loader2 className="animate-spin" size={16} />
              )}{" "}
              Generate QR
            </button>
            {error && <div className="text-sm text-rose-600">{error}</div>}
          </div>

          {generated?.code && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600 mb-2">Your QR</div>
                <img
                  src={`/api/qr/image/${generated.code}?format=${format}&size=240`}
                  alt="QR"
                  className="w-[240px] h-[240px] object-contain"
                />
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <a
                    href={generated.url}
                    className="text-[#0066FF] hover:underline"
                  >
                    Open hosted link
                  </a>
                  <span className="text-slate-400">•</span>
                  <button
                    onClick={() => {
                      if (typeof navigator !== "undefined")
                        navigator.clipboard.writeText(
                          `${process.env.NEXT_PUBLIC_BASE_URL || ""}${generated.url}`.replace(
                            /undefined/g,
                            "",
                          ),
                        );
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Copy link
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600 mb-2">Pay this QR</div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      Phone (STK)
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                      placeholder="07XXXXXXXX"
                    />
                    <button
                      onClick={() => payMutation.mutate({ method: "stk" })}
                      disabled={payMutation.isPending || !phone}
                      className="mt-2 btn-primary rounded-md px-4 py-2 flex items-center gap-2"
                    >
                      <Smartphone size={16} /> Pay with STK
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      Wallet No
                    </label>
                    <input
                      value={walletNo}
                      onChange={(e) => setWalletNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                    />
                    <button
                      onClick={() => payMutation.mutate({ method: "wallet" })}
                      disabled={payMutation.isPending || !walletNo}
                      className="mt-2 btn-primary rounded-md px-4 py-2 flex items-center gap-2"
                    >
                      <Wallet size={16} /> Pay with Wallet
                    </button>
                  </div>
                  {payMutation.isPending && (
                    <div className="text-sm text-slate-600">Processing...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
