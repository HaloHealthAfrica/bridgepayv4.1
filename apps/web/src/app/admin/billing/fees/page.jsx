import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/utils/apiFetch";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "sonner";

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export default function AdminBillingFeesPage() {
  const qc = useQueryClient();
  const [selectedCode, setSelectedCode] = useState(null);
  const [query, setQuery] = useState("");

  const feesQ = useQuery({
    queryKey: ["billing", "fees"],
    queryFn: async () => apiFetch("/api/billing/fees"),
  });

  const fees = feesQ.data?.fees || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return fees;
    return fees.filter((f) => {
      const hay = `${f.code} ${f.name} ${f.applies_to} ${f.payer} ${f.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [fees, query]);

  const selected = fees.find((f) => f.code === selectedCode) || null;

  const [form, setForm] = useState({
    code: "",
    name: "",
    fee_type: "percentage",
    applies_to: "MERCHANT_PAYMENT",
    payer: "customer",
    amount: "",
    rate: "0.01",
    status: "active",
    effective_start: "",
    effective_end: "",
    metadata: "{}",
  });

  // Keep form in sync when selecting a fee
  useMemo(() => {
    if (!selected) return;
    setForm({
      code: selected.code || "",
      name: selected.name || "",
      fee_type: selected.fee_type || "percentage",
      applies_to: selected.applies_to || "MERCHANT_PAYMENT",
      payer: selected.payer || "customer",
      amount: selected.amount == null ? "" : String(selected.amount),
      rate: selected.rate == null ? "" : String(selected.rate),
      status: selected.status || "active",
      effective_start: selected.effective_start || "",
      effective_end: selected.effective_end || "",
      metadata: JSON.stringify(selected.metadata || {}, null, 2),
    });
  }, [selectedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
      const metadata = safeJsonParse(form.metadata) ?? {};
      return apiFetch("/api/billing/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          fee_type: form.fee_type,
          applies_to: form.applies_to,
          payer: form.payer,
          amount: form.amount === "" ? null : Number(form.amount),
          rate: form.rate === "" ? null : Number(form.rate),
          status: form.status,
          effective_start: form.effective_start || null,
          effective_end: form.effective_end || null,
          metadata,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Saved fee");
      await qc.invalidateQueries({ queryKey: ["billing", "fees"] });
    },
    onError: (e) => toast.error(e?.message || "Failed to save fee"),
  });

  return (
    <AdminShell title="Fees Catalog">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">Fees</div>
              <div className="text-sm text-slate-600">
                Create and manage fee rules by flow.
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedCode(null);
                setForm({
                  code: "",
                  name: "",
                  fee_type: "percentage",
                  applies_to: "MERCHANT_PAYMENT",
                  payer: "customer",
                  amount: "",
                  rate: "0.01",
                  status: "active",
                  effective_start: "",
                  effective_end: "",
                  metadata: "{}",
                });
              }}
            >
              New fee
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-900">
                  Catalog ({filtered.length})
                </div>
                <div className="w-64">
                  <Input
                    placeholder="Search…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="max-h-[560px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b">
                    <tr className="text-left text-slate-600">
                      <th className="p-3">Code</th>
                      <th className="p-3">Applies to</th>
                      <th className="p-3">Payer</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feesQ.isLoading ? (
                      <tr>
                        <td className="p-3 text-slate-600" colSpan={5}>
                          Loading…
                        </td>
                      </tr>
                    ) : filtered.length ? (
                      filtered.map((f) => (
                        <tr
                          key={f.code}
                          className="border-b hover:bg-slate-50 cursor-pointer"
                          onClick={() => setSelectedCode(f.code)}
                        >
                          <td className="p-3 font-medium text-slate-900">
                            {f.code}
                          </td>
                          <td className="p-3 text-slate-700">{f.applies_to}</td>
                          <td className="p-3 text-slate-700">{f.payer}</td>
                          <td className="p-3 text-slate-700">{f.fee_type}</td>
                          <td className="p-3 text-slate-700">{f.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-slate-600" colSpan={5}>
                          No fees found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <div className="text-sm font-medium text-slate-900">
                {selected ? `Edit: ${selected.code}` : "Create fee"}
              </div>
              <div className="text-xs text-slate-500">
                Saved via `POST /api/billing/fees` (upserts by code)
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Code
                  </div>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="MDR_DEFAULT"
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Status
                  </div>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-1">Name</div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Checkout Convenience Fee"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Applies to
                  </div>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.applies_to}
                    onChange={(e) => setForm((f) => ({ ...f, applies_to: e.target.value }))}
                  >
                    <option value="MERCHANT_PAYMENT">MERCHANT_PAYMENT</option>
                    <option value="SPLIT">SPLIT</option>
                    <option value="TOPUP">TOPUP</option>
                    <option value="WITHDRAWAL">WITHDRAWAL</option>
                    <option value="PROJECT">PROJECT</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="FX">FX</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">Payer</div>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.payer}
                    onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))}
                  >
                    <option value="customer">customer</option>
                    <option value="merchant">merchant</option>
                    <option value="platform">platform</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Fee type
                  </div>
                  <select
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.fee_type}
                    onChange={(e) => setForm((f) => ({ ...f, fee_type: e.target.value }))}
                  >
                    <option value="percentage">percentage</option>
                    <option value="flat">flat</option>
                    <option value="tiered">tiered</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1">
                    Rate (e.g. 0.01)
                  </div>
                  <Input
                    value={form.rate}
                    onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                    placeholder="0.01"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-1">
                  Flat amount (optional)
                </div>
                <Input
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="50"
                />
              </div>

              <div>
                <div className="text-xs font-medium text-slate-700 mb-1">
                  Metadata (JSON)
                </div>
                <textarea
                  className="w-full min-h-[140px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                  value={form.metadata}
                  onChange={(e) => setForm((f) => ({ ...f, metadata: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => qc.invalidateQueries({ queryKey: ["billing", "fees"] })}
                >
                  Refresh
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}


