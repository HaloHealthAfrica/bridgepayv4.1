import React from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatusPill } from '@/components/common/StatusPill';
import { formatCurrency } from '@/utils/formatCurrency';

function useParamsFromPath() {
  if (typeof window !== 'undefined') {
    const m = window.location.pathname.match(/\/payments\/intent\/([^/]+)/);
    return { id: m ? m[1] : null };
  }
  return { id: null };
}

export default function PaymentIntentDetailPage() {
  const params = useParams();
  const pathParams = useParamsFromPath();
  const id = params.id || pathParams.id;

  const intentQuery = useQuery({
    queryKey: ['intent', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/payments/intent/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch intent: ${res.statusText}`);
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const feesQuery = useQuery({
    queryKey: ['billing-lines', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/billing/transactions/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch billing lines: ${res.statusText}`);
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const intent = intentQuery.data?.intent;
  const external = intentQuery.data?.external || [];
  const currency = intent?.currency || 'KES';

  if (intentQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-text-secondary">Loading…</div>
        </div>
      </div>
    );
  }

  if (intentQuery.error || !intent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-error">
            {intentQuery.error ? 'Could not load intent' : 'Not found'}
          </div>
        </div>
      </div>
    );
  }

  const statusMap: Record<string, 'pending' | 'success' | 'failed'> = {
    completed: 'success',
    pending: 'pending',
    failed: 'failed',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Payment Intent</h1>
          <p className="text-text-secondary">Intent ID: {intent.id}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Overview */}
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h3 className="text-lg font-bold mb-4">Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-text-secondary">Intent ID</div>
                <code className="px-3 py-1 bg-background border border-[#E0E0E0] rounded-lg font-mono text-sm">
                  {intent.id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-text-secondary">Amount due</div>
                <div className="font-bold text-lg">
                  {formatCurrency(intent.amount_due || 0, currency)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-text-secondary">Currency</div>
                <div>{intent.currency}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-text-secondary">Status</div>
                <StatusPill
                  status={statusMap[String(intent.status).toLowerCase()] || 'pending'}
                />
              </div>
            </div>

            {intent.funding_plan && intent.funding_plan.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-text mb-3">Funding Plan</h4>
                <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-background">
                      <tr>
                        <th className="py-2 px-3 text-left text-text-secondary font-semibold">Type</th>
                        <th className="py-2 px-3 text-left text-text-secondary font-semibold">Amount</th>
                        <th className="py-2 px-3 text-left text-text-secondary font-semibold">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intent.funding_plan.map((fs: any, i: number) => (
                        <tr key={i} className="border-t border-[#E0E0E0]">
                          <td className="py-2 px-3">{fs.type}</td>
                          <td className="py-2 px-3 font-semibold">
                            {formatCurrency(fs.amount || 0, currency)}
                          </td>
                          <td className="py-2 px-3">{fs.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* External Payments */}
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <h3 className="text-lg font-bold mb-4">External Payments</h3>
            {external.length === 0 ? (
              <div className="text-text-secondary text-sm">None</div>
            ) : (
              <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-background">
                    <tr>
                      <th className="py-2 px-3 text-left text-text-secondary font-semibold">Type</th>
                      <th className="py-2 px-3 text-left text-text-secondary font-semibold">Amount</th>
                      <th className="py-2 px-3 text-left text-text-secondary font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {external.map((e: any) => (
                      <tr key={e.id} className="border-t border-[#E0E0E0]">
                        <td className="py-2 px-3">{e.type}</td>
                        <td className="py-2 px-3 font-semibold">
                          {formatCurrency(e.amount || 0, e.currency || currency)}
                        </td>
                        <td className="py-2 px-3">
                          <StatusPill
                            status={statusMap[String(e.status).toLowerCase()] || 'pending'}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Billing Lines */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <h3 className="text-lg font-bold mb-4">Billing Lines</h3>
          {feesQuery.isLoading ? (
            <div className="text-text-secondary text-sm">Loading…</div>
          ) : feesQuery.error ? (
            <div className="text-error text-sm">Could not load billing lines</div>
          ) : (feesQuery.data?.items || []).length === 0 ? (
            <div className="text-text-secondary text-sm">No fees recorded</div>
          ) : (
            <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background">
                  <tr>
                    <th className="py-2 px-3 text-left text-text-secondary font-semibold">Code</th>
                    <th className="py-2 px-3 text-left text-text-secondary font-semibold">Payer</th>
                    <th className="py-2 px-3 text-left text-text-secondary font-semibold">Amount</th>
                    <th className="py-2 px-3 text-left text-text-secondary font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {feesQuery.data.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-[#E0E0E0]">
                      <td className="py-2 px-3 font-mono text-xs">{it.fee_code}</td>
                      <td className="py-2 px-3">{it.payer_account}</td>
                      <td className="py-2 px-3 font-semibold">
                        {formatCurrency(it.amount || 0, it.currency || currency)}
                      </td>
                      <td className="py-2 px-3">
                        <StatusPill
                          status={statusMap[String(it.status).toLowerCase()] || 'pending'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

