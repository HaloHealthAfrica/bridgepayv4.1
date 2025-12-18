import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Clock, CheckCircle, DollarSign, Activity, Eye, ThumbsUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';

function ProjectVerifierDashboardContent() {
  // Fetch pending milestones
  const pendingQuery = useQuery({
    queryKey: ['project-verifier-pending'],
    queryFn: async () => {
      const res = await fetch('/api/project-verifier/pending');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch pending milestones');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch pending milestones');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const pendingMilestones = pendingQuery.data?.items || [];
  const stats = pendingQuery.data?.stats || {
    pendingReviews: 0,
    approvedThisWeek: 0,
    valueVerified: 0,
    activeProjects: 0,
  };

  const handleApprove = (milestone: typeof pendingMilestones[0]) => {
    toast.success(
      `✅ Approved! ${formatCurrency(milestone.amount, milestone.currency || 'KES')} released to implementer.`
    );
  };

  const handleReview = (milestone: typeof pendingMilestones[0]) => {
    toast.info(`Opening evidence viewer for: ${milestone.milestone}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Project Verification Queue ✅</h1>
          <p className="text-text-secondary">Review and approve project milestones</p>
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
            <StatCard icon={Clock} label="Pending Reviews" value={stats.pendingReviews?.toString() || '0'} color="warning" />
            <StatCard icon={CheckCircle} label="Approved This Week" value={stats.approvedThisWeek?.toString() || '0'} color="success" />
            <StatCard icon={DollarSign} label="Value Verified" value={formatCurrency(stats.valueVerified || 0, stats.currency || 'KES')} color="primary" />
            <StatCard icon={Activity} label="Active Projects" value={stats.activeProjects?.toString() || '0'} color="primary" />
          </div>
        )}

        {/* Pending Milestones */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <h2 className="text-lg font-bold mb-5">Milestones Awaiting Review</h2>

          {pendingQuery.isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading milestones...</div>
          ) : pendingQuery.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
              Failed to load milestones: {(pendingQuery.error as Error).message}
            </div>
          ) : pendingMilestones.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <CheckCircle size={48} className="text-text-secondary mx-auto mb-4" />
              <div className="text-base">All caught up! No pending reviews.</div>
            </div>
          ) : (
            pendingMilestones.map((item: any) => (
              <div key={item.id} className="p-5 bg-background rounded-xl mb-3">
                <div className="flex justify-between items-start mb-3 flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-xs text-text-secondary mb-1">{item.project}</div>
                    <div className="font-bold text-base mb-1">{item.milestone}</div>
                    <div className="text-sm text-text-secondary mb-2">
                      by {item.implementer}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Evidence: {item.evidence}
                    </div>
                  </div>
                  <StatusPill status="active" />
                </div>
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <span className="text-sm text-text-secondary">Escrow Release: </span>
                    <span className="font-bold text-base text-primary">
                      {formatCurrency(item.amount, item.currency || 'KES')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="secondary"
                      icon={Eye}
                      onClick={() => handleReview(item)}
                    >
                      Review
                    </Button>
                    <Button icon={ThumbsUp} onClick={() => handleApprove(item)}>
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

