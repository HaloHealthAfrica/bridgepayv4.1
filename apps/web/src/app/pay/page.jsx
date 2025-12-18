import { useEffect, useMemo, useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import useUser from "@/utils/useUser";
import { toast, Toaster } from "sonner";
import { Phone, Wallet, Lock, ArrowRight, Loader2 } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";

function genOrderRef() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `ref-${Date.now()}-${rnd}`;
}

function maskPhone(p) {
  const s = String(p || "");
  if (s.length < 4) return s;
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function validate({ method, amount, phone, wallet, reference }) {
  const errors = {};
  const amt = Number(amount);
  if (!amt || Number.isNaN(amt) || amt <= 0.01) {
    errors.amount = "Enter an amount greater than 0.01";
  }
  if (!reference || !/^[A-Za-z0-9-_]+$/.test(reference)) {
    errors.reference = "Use letters, numbers, dash or underscore";
  }
  if (method === "stk") {
    if (!phone || !/^((\+?254)?0?7\d{8})$/.test(phone.replace(/\s+/g, ""))) {
      errors.phone = "Enter a valid phone like 0712… or +254712…";
    }
  } else if (method === "wallet") {
    if (!wallet || String(wallet).length < 6 || String(wallet).length > 20) {
      errors.wallet = "Wallet number must be 6–20 characters";
    }
  }
  return errors;
}

export default function PayPage() {
  const { data: user, loading } = useUser();
  const [method, setMethod] = useState("stk"); // 'stk' | 'wallet'
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(genOrderRef());
  const [description, setDescription] = useState("Payment");
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState("11391837");
  const [errorMsg, setErrorMsg] = useState(null);

  // Prefill from query params (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const qAmount = sp.get("amount");
    const qRef = sp.get("reference");
    const qPhone = sp.get("phone");
    const qWallet = sp.get("wallet_no");
    const qDesc = sp.get("description");
    const qMethod = sp.get("method");
    if (qAmount) setAmount(qAmount);
    if (qRef) setReference(qRef);
    if (qPhone) setPhone(qPhone);
    if (qWallet) setWallet(qWallet);
    if (qDesc) setDescription(qDesc);
    if (qMethod && (qMethod === "stk" || qMethod === "wallet"))
      setMethod(qMethod);
  }, []);

  const endpoint = useMemo(() => {
    const role = user?.role;
    if (role === "customer") return "/api/payments/lemonade/create-self";
    return "/api/payments/lemonade/create";
  }, [user?.role]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: Number(amount),
        order_reference: reference,
      };
      if (description && description !== "") payload.description = description;
      if (method === "stk") payload.phone_number = phone;
      if (method === "wallet") payload.wallet_no = wallet;

      const body = {
        action: method === "stk" ? "stk_push" : "wallet_payment",
        payload,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        let j = null;
        try {
          j = t ? JSON.parse(t) : null;
        } catch {}
        throw Object.assign(new Error("create_failed"), {
          status: res.status,
          json: j,
        });
      }
      return res.json();
    },
  });

  const onSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      setErrorMsg(null);
      const errs = validate({ method, amount, phone, wallet, reference });
      if (Object.keys(errs).length) {
        setErrorMsg("Please fix the errors below");
        return;
      }
      try {
        const result = await mutation.mutateAsync();
        if (result?.ok && result?.payment_id) {
          if (typeof window !== "undefined") {
            window.location.href = `/pay/success/${result.payment_id}`;
          }
        } else {
          setErrorMsg(
            result?.data?.message ||
              result?.error ||
              "Could not create payment",
          );
          // keep form filled for retry
        }
      } catch (err) {
        console.error(err);
        const j = err?.json;
        const msg = j?.data?.message || j?.error || "Could not create payment";
        setErrorMsg(msg);
      }
    },
    [method, amount, phone, wallet, reference, description, endpoint, mutation],
  );

  if (loading) {
    return (
      <PortalLayout>
        <div className="p-4 md:p-8 max-w-[800px] mx-auto">
          <div className="card p-6">Loading…</div>
        </div>
      </PortalLayout>
    );
  }

  // Access control: must be signed in
  if (!user) {
    const callback = encodeURIComponent("/pay");
    return (
      <PortalLayout>
        <div className="p-4 md:p-8 max-w-[720px] mx-auto">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-slate-900 mb-2">
              <Lock size={18} />
              <h1 className="text-lg font-semibold">Sign in to continue</h1>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Please sign in to start your send. You’ll come back here right
              after.
            </p>
            <a
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-[#0066FF] text-white hover:bg-[#0057d6]"
              href={`/account/signin?callbackUrl=${callback}`}
            >
              Sign in
            </a>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // Allowed roles: customer, merchant, admin (create-self for customer, create for others)
  const role = user?.role || "customer";

  const errs = validate({ method, amount, phone, wallet, reference });

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast("Copied");
    }
  };

  const isPending = mutation.isPending;

  return (
    <PortalLayout>
      <div className="p-4 md:p-8 max-w-[800px] mx-auto">
        <Toaster position="top-right" richColors />
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900">Send money</h1>
          <p className="text-sm text-slate-600">
            We’ll ask your provider to confirm on your phone.
          </p>
        </div>

        {/* Method selector */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMethod("stk")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${method === "stk" ? "bg-[#0066FF] text-white border-transparent" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
            disabled={isPending}
          >
            <Phone size={16} /> STK Push
          </button>
          <button
            type="button"
            onClick={() => setMethod("wallet")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors ${method === "wallet" ? "bg-[#0066FF] text-white border-transparent" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"}`}
            disabled={isPending}
          >
            <Wallet size={16} /> Wallet
          </button>
        </div>

        <form onSubmit={onSubmit} className="card p-4">
          {/* Amount */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              className="w-full border rounded-md px-3 py-2"
              placeholder="0.00"
            />
            {errs.amount && (
              <p className="text-red-600 text-sm mt-1">{errs.amount}</p>
            )}
          </div>

          {/* Reference + copy */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Reference</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={isPending}
                className="flex-1 border rounded-md px-3 py-2 font-mono"
              />
              <button
                type="button"
                onClick={() => onCopy(reference)}
                className="px-3 py-2 border rounded-md"
                disabled={isPending}
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-[#666] mt-1 font-mono break-all">
              {reference}
            </p>
            {errs.reference && (
              <p className="text-red-600 text-sm mt-1">{errs.reference}</p>
            )}
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Description{" "}
              <span className="text-[#888] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Payment"
            />
          </div>

          {/* Method-specific fields */}
          {method === "stk" ? (
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isPending}
                className="w-full border rounded-md px-3 py-2"
                placeholder="0712 345 678"
              />
              {errs.phone && (
                <p className="text-red-600 text-sm mt-1">{errs.phone}</p>
              )}
              <p className="text-xs text-[#666] mt-1">
                You’ll receive a prompt on your phone to confirm.
              </p>
            </div>
          ) : (
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">
                Wallet number
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                disabled={isPending}
                className="w-full border rounded-md px-3 py-2"
                placeholder="11391837"
              />
              {errs.wallet && (
                <p className="text-red-600 text-sm mt-1">{errs.wallet}</p>
              )}
              <p className="text-xs text-[#666] mt-1">
                We’ll debit your wallet after you confirm.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 mb-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {isPending && (
            <p className="text-xs text-[#666] mb-2">Waiting for provider…</p>
          )}

          <div className="flex flex-col md:flex-row gap-3 mt-3">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#0066FF] hover:bg-[#0057d6] text-white disabled:opacity-70 w-full md:w-auto"
            >
              {isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
              Send now
            </button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border w-full md:w-auto"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
