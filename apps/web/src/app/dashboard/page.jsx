import useUser from "@/utils/useUser";
import PortalLayout from "@/components/PortalLayout";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function DashboardPage() {
  const { data: user, loading: userLoading } = useUser();

  // Wallet summary
  const walletQuery = useQuery({
    queryKey: ["wallet-summary"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/summary");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/wallet/summary, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Recent activity
  const activityQuery = useQuery({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const res = await fetch("/api/activity?limit=10");
      if (!res.ok) {
        throw new Error(
          `When fetching /api/activity, the response was [${res.status}] ${res.statusText}`,
        );
      }
      return res.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const balance = walletQuery.data?.balance ?? 0;
  const monthlyChange = walletQuery.data?.monthly_change ?? 0;
  const spent = walletQuery.data?.spent ?? 0;
  const saved = walletQuery.data?.saved ?? 0;

  const donutData = [
    { name: "Bills", value: Math.max(0, spent * 0.35) },
    { name: "Transfers", value: Math.max(0, spent * 0.25) },
    { name: "Shopping", value: Math.max(0, spent * 0.2) },
    { name: "Other", value: Math.max(0, spent * 0.2) },
  ];
  const donutColors = ["#0066FF", "#00C853", "#FFB020", "#64748B"];

  const formatCurrency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 2,
    }).format(Number(n || 0));

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Removed the top hero rectangle above Quick Actions as requested */}
        {/* Quick actions block (now first) */}
        <div className="card p-4">
          <h3 className="text-slate-900 font-semibold mb-3">Quick actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Renamed from "Make a payment" to "Pay" */}
            <a
              href="/pay"
              className="rounded-md px-4 py-2 text-center bg-[#0066FF] text-white hover:bg-[#0057d6] transition-colors"
            >
              Pay
            </a>
            {/* Added Send button into Quick Actions */}
            <a
              href="/pay"
              className="rounded-md px-4 py-2 text-center border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Send
            </a>
            <a
              href="/qr-payment"
              className="rounded-md px-4 py-2 text-center border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              QR Pay
            </a>
            <a
              href="/payments/split"
              className="rounded-md px-4 py-2 text-center border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Split bill
            </a>
            <a
              href="/payments/scheduled"
              className="rounded-md px-4 py-2 text-center border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Schedule
            </a>
          </div>
        </div>

        {/* Reflow: Recent Activity first, then Spending Overview, then Merchant Shopping as requested */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-900 font-semibold">Recent Activity</h3>
              <a
                href="/payments"
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                View all
              </a>
            </div>
            {activityQuery.isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded" />
                <div className="h-4 bg-slate-200 rounded" />
              </div>
            ) : activityQuery.error ? (
              <div className="text-sm text-slate-600">
                Could not load activity.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {(activityQuery.data?.items || []).map((t, idx) => {
                  const isCredit = t.type === "credit";
                  return (
                    <li
                      key={idx}
                      className="py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isCredit ? "bg-emerald-50" : "bg-rose-50"}`}
                        >
                          {isCredit ? (
                            <ArrowUpRight size={16} color="#00C853" />
                          ) : (
                            <ArrowDownRight size={16} color="#FF3B30" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm text-slate-900 font-medium">
                            {t.title || (isCredit ? "Received" : "Sent")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {t.counterparty || "-"} • {t.time || "recent"}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${isCredit ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {isCredit ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </div>
                    </li>
                  );
                })}
                {(!activityQuery.data?.items ||
                  activityQuery.data.items.length === 0) && (
                  <li className="py-6 text-center text-slate-500 text-sm">
                    No activity yet
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Spending Overview */}
          <div className="card p-4">
            <h3 className="text-slate-900 font-semibold mb-3">
              Spending Overview
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`c-${index}`}
                        fill={donutColors[index % donutColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {donutData.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{
                      backgroundColor: donutColors[i % donutColors.length],
                    }}
                  />
                  {d.name}
                </div>
              ))}
            </div>
          </div>

          {/* Merchant Shopping (blank rectangle placed under Spending Overview) */}
          <div className="card p-4">
            <h3 className="text-slate-900 font-semibold mb-3">
              Merchant Shopping
            </h3>
            <div className="text-sm text-slate-600">
              We will showcase merchant products here.
            </div>
            {/* Placeholder area for upcoming merchant product cards */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="h-24 rounded-md border border-dashed border-slate-300 bg-slate-50" />
              <div className="h-24 rounded-md border border-dashed border-slate-300 bg-slate-50" />
              <div className="h-24 rounded-md border border-dashed border-slate-300 bg-slate-50" />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .font-inter {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        }
      `}</style>
    </PortalLayout>
  );
}
