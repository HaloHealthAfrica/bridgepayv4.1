"use client";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useUser from "@/utils/useUser";

function Pill({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    active: "bg-emerald-50 text-emerald-700",
    used: "bg-green-100 text-green-700",
    expired: "bg-gray-100 text-gray-700",
    disabled: "bg-gray-100 text-gray-700",
  };
  const cls = map[s] || "bg-slate-100 text-slate-700";
  return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{status}</span>;
}

export default function QRMgmtPage() {
  const queryClient = useQueryClient();
  const { data: user } = useUser();

  const list = useQuery({
    queryKey: ["qr-list"],
    queryFn: async () => {
      const res = await fetch(`/api/qr?limit=50`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "forbidden");
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [form, setForm] = useState({
    mode: "pay",
    amount: 2,
    currency: "KES",
    expiresIn: 15 * 60,
  });
  const gen = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(`/api/qr/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-list"] });
    },
  });

  const deactivate = useMutation({
    mutationFn: async (code) => {
      const res = await fetch(`/api/qr/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "failed");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-list"] });
    },
  });

  if (list.isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-3">QR Codes</h1>
        <div className="text-slate-600">
          Forbidden. Please sign in as merchant/admin.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-3">QR Codes</h1>

      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Type</label>
            <select
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="pay">Pay</option>
              <option value="receive">Receive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: Number(e.target.value) }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">
              Currency
            </label>
            <input
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">
              Expiry (sec)
            </label>
            <input
              type="number"
              value={form.expiresIn}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiresIn: Number(e.target.value) }))
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <button
          onClick={() => gen.mutate(form)}
          className="mt-3 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-black"
        >
          {gen.isLoading ? "Generating…" : "Generate QR"}
        </button>
        {gen.data?.ok && (
          <div className="mt-3 text-sm">
            Link:{" "}
            <a
              className="text-blue-600 underline"
              href={gen.data.url}
              target="_blank"
              rel="noreferrer"
            >
              {gen.data.url}
            </a>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Latest QRs</div>
          <button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["qr-list"] })
            }
            className="text-sm bg-slate-100 px-3 py-1 rounded hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>
        {list.isLoading ? (
          <div className="text-slate-600">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Mode</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Expires</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(list.data?.items || []).map((r) => (
                  <tr key={r.code} className="border-t">
                    <td className="py-2 pr-4 font-mono">{r.code}</td>
                    <td className="py-2 pr-4">{r.mode}</td>
                    <td className="py-2 pr-4">{r.amount ?? "-"}</td>
                    <td className="py-2 pr-4">{r.currency}</td>
                    <td className="py-2 pr-4">
                      <Pill status={r.status} />
                    </td>
                    <td className="py-2 pr-4">
                      {r.expires_at
                        ? new Date(r.expires_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-2 pr-4 flex gap-2 flex-wrap">
                      <a
                        className="text-blue-600 underline"
                        href={`/q/${r.code}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open link
                      </a>
                      <button
                        className="text-slate-700 underline"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            `${window.location.origin}/q/${r.code}`,
                          )
                        }
                      >
                        Copy link
                      </button>
                      {/* Added lightweight QR image links */}
                      <a
                        className="text-slate-700 underline"
                        href={`/api/qr/image/${r.code}?format=svg&size=320`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        QR SVG
                      </a>
                      <a
                        className="text-slate-700 underline"
                        href={`/api/qr/image/${r.code}?format=png&size=512`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        QR PNG
                      </a>
                      {r.status === "active" && (
                        <button
                          className="text-red-600 underline"
                          onClick={() => deactivate.mutate(r.code)}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
