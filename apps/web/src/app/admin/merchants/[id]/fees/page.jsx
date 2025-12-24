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

export default function AdminMerchantFeeOverridesPage({ params }) {
  const merchantId = params?.id;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "merchant_fee_profiles", merchantId],
    queryFn: async () => apiFetch(`/api/admin/merchants/${merchantId}/fee-profiles`),
    enabled: !!merchantId,
  });

  const merchant = q.data?.merchant || null;
  const fees = q.data?.fees || [];
  const profiles = q.data?.profiles || [];
  const profileByCode = useMemo(() => {
    const m = Object.create(null);
    for (const p of profiles) m[p.fee_code] = p;
    return m;
  }, [profiles]);

  const [search, setSearch] = useState("");
  const [selectedFee, setSelectedFee] = useState(null);
  const [status, setStatus] = useState("active");
  const [overridesText, setOverridesText] = useState("{\n  \"rate\": 0.01\n}\n");

  const filteredFees = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return fees;
    return fees.filter((f) => {
      const hay = `${f.code} ${f.name} ${f.applies_to}`.toLowerCase();
      return hay.includes(s);
    });
  }, [fees, search]);

  const selectFee = (fee) => {
    setSelectedFee(fee.code);
    const existing = profileByCode[fee.code];
    setStatus(existing?.status || "active");
    setOverridesText(JSON.stringify(existing?.overrides || {}, null, 2));
  };

  const save = useMutation({
    mutationFn: async () => {
      const overrides = safeJsonParse(overridesText) ?? {};
      return apiFetch(`/api/admin/merchants/${merchantId}/fee-profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee_code: selectedFee,
          status,
          overrides,
        }),
      });
    },
    onSuccess: async () => {
      toast.success("Saved override");
      await qc.invalidateQueries({ queryKey: ["admin", "merchant_fee_profiles", merchantId] });
    },
    onError: (e) => toast.error(e?.message || "Failed to save override"),
  });

  return (
    <AdminShell title="Merchant Fee Overrides">
      <div className="space-y-4">
        <div>
          <div className="text-xl font-semibold text-slate-900">
            Merchant Fee Overrides
          </div>
          <div className="text-sm text-slate-600">
            Merchant: {merchant ? `${merchant.email} (id ${merchant.id})` : merchantId}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900">
                    Fee Catalog ({filteredFees.length})
                  </div>
                  <div className="w-72">
                    <Input
                      placeholder="Search fee code/name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="max-h-[620px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b">
                      <tr className="text-left text-slate-600">
                        <th className="p-3">Code</th>
                        <th className="p-3">Applies to</th>
                        <th className="p-3">Default</th>
                        <th className="p-3">Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.isLoading ? (
                        <tr>
                          <td className="p-3 text-slate-600" colSpan={4}>
                            Loading…
                          </td>
                        </tr>
                      ) : filteredFees.length ? (
                        filteredFees.map((f) => {
                          const p = profileByCode[f.code] || null;
                          const def =
                            f.fee_type === "percentage"
                              ? `rate=${f.rate ?? "-"}`
                              : f.fee_type === "flat"
                                ? `amount=${f.amount ?? "-"}`
                                : f.fee_type;
                          return (
                            <tr
                              key={f.code}
                              className="border-b hover:bg-slate-50 cursor-pointer"
                              onClick={() => selectFee(f)}
                            >
                              <td className="p-3 font-medium text-slate-900">{f.code}</td>
                              <td className="p-3 text-slate-700">{f.applies_to}</td>
                              <td className="p-3 text-slate-700">{def}</td>
                              <td className="p-3 text-slate-700">
                                {p ? `${p.status}` : "-"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td className="p-3 text-slate-600" colSpan={4}>
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
                  {selectedFee ? `Override: ${selectedFee}` : "Select a fee"}
                </div>
                <div className="text-xs text-slate-500">
                  Overrides are stored in `merchant_fee_profiles.overrides` (JSON).
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {!selectedFee ? (
                  <div className="text-sm text-slate-600">
                    Pick a fee from the left to create/edit the merchant override.
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-1">
                        Status
                      </div>
                      <select
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-1">
                        Overrides (JSON)
                      </div>
                      <textarea
                        className="w-full min-h-[260px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                        value={overridesText}
                        onChange={(e) => setOverridesText(e.target.value)}
                      />
                      <div className="text-xs text-slate-500 mt-1">
                        Examples: {"{ \"rate\": 0.012 }"}, {"{ \"amount\": 50 }"}, {"{ \"fee_type\": \"flat\" }"}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          qc.invalidateQueries({
                            queryKey: ["admin", "merchant_fee_profiles", merchantId],
                          })
                        }
                      >
                        Refresh
                      </Button>
                      <Button
                        onClick={() => save.mutate()}
                        disabled={save.isPending}
                      >
                        {save.isPending ? "Saving…" : "Save override"}
                      </Button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}


