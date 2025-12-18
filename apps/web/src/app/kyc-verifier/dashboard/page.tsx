import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Clock, CheckCircle, XCircle, Award, Eye } from 'lucide-react';

function KYCVerifierDashboardContent() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'individual' | 'business'>('all');

  // Fetch pending KYC verifications
  const pendingQuery = useQuery({
    queryKey: ['kyc-pending', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      
      const res = await fetch(`/api/kyc-verifier/pending?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch pending verifications');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch pending verifications');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const pendingItems = pendingQuery.data?.items || [];
  const stats = pendingQuery.data?.stats || {
    pending: 0,
    individual: 0,
    business: 0,
    approvedToday: 0,
    rejectedToday: 0,
    thisMonth: 0,
  };

  const filteredItems = useMemo(() => {
    if (filter === 'all') return pendingItems;
    return pendingItems.filter((item: any) => item.type.toLowerCase() === filter);
  }, [pendingItems, filter]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">KYC Verification Queue 🔍</h1>
          <p className="text-text-secondary">Review and approve identity documents</p>
        </div>

        {/* Stats Grid */}
        {pendingQuery.isLoading ? (
          <div className="text-center py-8 text-text-secondary mb-8">Loading stats...</div>
        ) : pendingQuery.error ? (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-8 text-error">
            Failed to load stats: {(pendingQuery.error as Error).message}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Clock} label="Pending Reviews" value={stats.pending?.toString() || '0'} color="warning" />
            <StatCard icon={CheckCircle} label="Approved Today" value={stats.approvedToday?.toString() || '0'} color="success" />
            <StatCard icon={XCircle} label="Rejected Today" value={stats.rejectedToday?.toString() || '0'} color="warning" />
            <StatCard icon={Award} label="This Month" value={stats.thisMonth?.toString() || '0'} color="primary" />
          </div>
        )}

        {/* Pending Verifications */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
            <h2 className="text-lg font-bold">Pending Verifications</h2>
          </div>
          {pendingQuery.isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading verifications...</div>
          ) : pendingQuery.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
              Failed to load verifications: {(pendingQuery.error as Error).message}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <CheckCircle size={48} className="text-text-secondary mx-auto mb-4" />
              <div className="text-base">All caught up! No pending verifications.</div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                <h2 className="text-lg font-bold">Pending Verifications</h2>
                <div className="flex gap-2 flex-wrap">
                  {['All', 'Individual', 'Business'].map((tab) => {
                    const tabValue = tab.toLowerCase() as typeof filter;
                    const isActive =
                      (tab === 'All' && filter === 'all') ||
                      (tab !== 'All' && filter === tabValue);
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilter(tab === 'All' ? 'all' : tabValue)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'border-2 border-[#E0E0E0] bg-white text-text'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredItems.map((item: any) => (
              <div
                key={item.id}
                className="p-5 bg-background rounded-xl mb-3"
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-3">
                  <div>
                    <div className="font-bold text-base mb-1">{item.name}</div>
                    <div className="text-sm text-text-secondary mb-1">
                      {item.type} • {item.docs}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Submitted {item.submitted}
                    </div>
                  </div>
                  <StatusPill status="pending" />
                </div>
                <Button
                  variant="secondary"
                  icon={Eye}
                  onClick={() => navigate(`/kyc-verifier/review/${item.id}`)}
                >
                  Review Documents
                </Button>
              </div>
              ))
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

