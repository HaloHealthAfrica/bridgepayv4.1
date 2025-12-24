import { useEffect } from "react";
import useUser from "@/utils/useUser";
import Button from "@/components/ui/Button";
import clsx from "classnames";

const NAV = [
  { label: "Overview", href: "/admin" },
  { label: "Billing Overview", href: "/admin/billing" },
  { label: "Fees Catalog", href: "/admin/billing/fees" },
  { label: "Billing Ledger", href: "/admin/billing/ledger" },
  { label: "Payments", href: "/admin/payments" },
  { label: "Payment Intents", href: "/admin/payments/intents" },
  { label: "External Payments", href: "/admin/payments/external" },
  { label: "Wallet Ops", href: "/admin/wallet" },
  { label: "Wallet Ledger", href: "/admin/wallet/ledger" },
  { label: "Funding Sessions", href: "/admin/wallet/sessions" },
  { label: "Withdrawals", href: "/admin/wallet/withdrawals" },
  { label: "Risk", href: "/admin/risk" },
  { label: "Disputes", href: "/admin/risk/disputes" },
  { label: "Webhook Events", href: "/admin/risk/webhooks" },
  { label: "Merchants", href: "/admin/merchants" },
];

export default function AdminShell({ title, children }) {
  const { data: user, loading } = useUser();

  useEffect(() => {
    if (!loading && !user) window.location.href = "/account/signin";
    if (!loading && user && user.role !== "admin") window.location.href = "/dashboard";
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold">
              B
            </div>
            <div>
              <div className="text-sm text-slate-500">Bridge Admin</div>
              <div className="text-sm font-medium text-slate-900">{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-600 hidden sm:block">
              {user.email} · {user.role}
            </div>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "/api/auth/logout")}
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <aside className="md:col-span-3">
          <nav className="rounded-xl border border-slate-200 bg-white p-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={clsx(
                  "block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50",
                  window.location.pathname === item.href &&
                    "bg-slate-100 text-slate-900 font-medium",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="md:col-span-9">{children}</main>
      </div>
    </div>
  );
}


