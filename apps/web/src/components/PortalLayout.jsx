import { useState, useMemo } from "react";
import useUser from "@/utils/useUser";
import {
  Home,
  Wallet,
  SendHorizonal,
  Folder,
  Clock,
  BarChart3,
  Settings,
  Receipt,
  QrCode,
  Users,
  ShieldCheck,
  Scale,
  CreditCard,
  FileText,
  HandCoins,
} from "lucide-react";

const primary = "#0066FF";

function NavItem({ href, label, Icon, activePath }) {
  const isActive =
    typeof window !== "undefined" && window.location.pathname === href;
  const base =
    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200";
  const active =
    "bg-[rgba(0,102,255,0.08)] text-slate-900 border border-[rgba(0,102,255,0.15)]";
  const idle = "text-slate-600 hover:text-slate-900 hover:bg-slate-100";
  return (
    <a href={href} className={`${base} ${isActive ? active : idle}`}>
      <Icon size={18} color={isActive ? primary : "#64748B"} />
      <span>{label}</span>
    </a>
  );
}

export default function PortalLayout({ children }) {
  const { data: user, loading } = useUser();
  const [open, setOpen] = useState(false);

  const role = user?.role || "customer";

  const menu = useMemo(() => {
    const common = [];
    if (role === "customer") {
      return [
        { href: "/dashboard", label: "Dashboard", Icon: Home },
        { href: "/wallet", label: "Wallet", Icon: Wallet },
        { href: "/payments/scheduled", label: "Scheduled", Icon: Clock },
        { href: "/projects", label: "Projects", Icon: Folder },
        { href: "/qr-payment", label: "QR Pay", Icon: QrCode },
        { href: "/payments/split", label: "Split", Icon: HandCoins },
        { href: "/settings", label: "Settings", Icon: Settings },
        ...common,
      ];
    }
    if (role === "merchant") {
      return [
        { href: "/dashboard", label: "Dashboard", Icon: Home },
        { href: "/admin/payments", label: "Payments", Icon: CreditCard },
        { href: "/invoices/new", label: "Invoices", Icon: FileText },
        { href: "/merchant/refunds", label: "Refunds", Icon: Receipt },
        { href: "/qr", label: "QR Codes", Icon: QrCode },
        { href: "/projects", label: "Projects", Icon: Folder },
        { href: "/customers", label: "Customers", Icon: Users },
        { href: "/settings", label: "Profile", Icon: Settings },
        ...common,
      ];
    }
    // admin
    return [
      { href: "/dashboard", label: "Dashboard", Icon: Home },
      { href: "/admin/disputes", label: "Disputes", Icon: Scale },
      { href: "/admin/metrics", label: "Metrics", Icon: BarChart3 },
      { href: "/qr", label: "QR Codes", Icon: QrCode },
      { href: "/merchant/refunds", label: "Refunds", Icon: Receipt },
      { href: "/projects", label: "Projects", Icon: Folder },
      { href: "/settings", label: "Settings", Icon: Settings },
      ...common,
    ];
  }, [role]);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md hover:bg-slate-100"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6H21"
                  stroke="#0F172A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 12H21"
                  stroke="#0F172A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 18H21"
                  stroke="#0F172A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <a href="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, #0066FF 0%, #5AA0FF 100%)",
                }}
              />
              <span className="font-semibold text-slate-900">Bridge</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <a
                href="/account/logout"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Sign out
              </a>
            ) : (
              <a
                href="/account/signin"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:static inset-y-16 md:inset-y-auto left-0 z-20 w-[260px] bg-white border-r border-slate-200 p-4 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        >
          <nav className="flex flex-col gap-1">
            {menu.map((m) => (
              <NavItem key={m.href} {...m} />
            ))}
          </nav>
          <div className="mt-auto pt-4">
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200" />
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {user.name || user.email || "User"}
                  </div>
                  <div className="text-xs text-slate-500 capitalize">
                    {role}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 md:ml-0 ml-[0] w-full md:w-auto md:overflow-visible overflow-hidden">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .btn-primary { background-color: ${primary}; color: white; }
        .btn-primary:hover { background-color: #0052CC; }
        .card { background: white; border: 1px solid #E5E7EB; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .badge { border-radius: 9999px; padding: 2px 8px; font-size: 12px; }
      `}</style>
    </div>
  );
}
