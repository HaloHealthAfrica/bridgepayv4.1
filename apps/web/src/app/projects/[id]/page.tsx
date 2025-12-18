import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatusPill } from '@/components/common/StatusPill';
import { ProgressBar } from '@/components/projects/ProgressBar';
import { MilestoneCard } from '@/components/projects/MilestoneCard';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Settings, Plus, DollarSign, Shield } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';
import { useSession } from '@auth/create/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MilestoneForm } from '@/components/projects/MilestoneForm';
import { ImplementerSelector } from '@/components/projects/ImplementerSelector';

function ProjectDetailContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'project-owner';

  // Fetch project
  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to load project');
      }
      const response = await res.json();
      // API returns { ok: true, id, title, ... } format (data is spread directly)
      if (!response.ok) {
        throw new Error(response.message || 'Failed to load project');
      }
      return response;
    },
  });

  const project = projectQuery.data;

  // Fetch milestones from API
  const milestonesQuery = useQuery({
    queryKey: ['project-milestones', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/milestones`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch milestones');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch milestones');
      }
      return data.items || [];
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const milestones = milestonesQuery.data || [];

  if (projectQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="text-text-secondary">Loading project...</div>
        </div>
      </div>
    );
  }

  if (projectQuery.error || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-7xl mx-auto">
          <div className="text-error">Failed to load project</div>
        </div>
      </div>
    );
  }

  const fundingProgress = project.targetAmount > 0
    ? Math.min(100, (project.currentAmount / project.targetAmount) * 100)
    : 0;

  const statusMap: Record<string, 'pending' | 'active' | 'success' | 'failed' | 'funding'> = {
    draft: 'pending',
    active: 'active',
    completed: 'success',
    cancelled: 'failed',
    funding: 'funding',
  };
  const displayStatus = statusMap[project.status] || 'pending';

  const queryClient = useQueryClient();
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const verifyMilestone = useMutation({
    mutationFn: async ({ milestoneId, action, notes }: { milestoneId: number; action: 'approve' | 'reject'; notes?: string }) => {
      const res = await fetch(`/api/projects/${id}/milestones/${milestoneId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to verify milestone');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  const handleApproveMilestone = (milestone: any) => {
    verifyMilestone.mutate({ milestoneId: milestone.id, action: 'approve' }, {
      onSuccess: () => {
        toast.success(`✅ Milestone approved! ${formatCurrency(milestone.amount, project.currency)} released from escrow.`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to approve milestone');
      },
    });
  };

  const handleRejectMilestone = (milestone: any) => {
    verifyMilestone.mutate({ milestoneId: milestone.id, action: 'reject' }, {
      onSuccess: () => {
        toast.error(`❌ Milestone rejected. Funds remain in escrow.`);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to reject milestone');
      },
    });
  };

  const handleViewEvidence = (milestone: any) => {
    if (milestone.evidence) {
      window.open(milestone.evidence, '_blank');
    } else {
      toast.info('No evidence available for this milestone');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/projects')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Projects
        </button>

        {/* Project Header */}
        <div className="bg-surface rounded-card p-8 mb-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <StatusPill status={displayStatus} />
              </div>
              <p className="text-base text-text-secondary mb-4">
                {project.description || 'No description'}
              </p>
              <div className="flex gap-2 flex-wrap">
                {project.category && (
                  <span className="bg-primary-light text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                    {project.category}
                  </span>
                )}
                {project.deadline && (
                  <span className="bg-primary-light text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                    {project.deadline}
                  </span>
                )}
              </div>
            </div>
            {userRole === 'project-owner' && (
              <div className="flex gap-2">
                <Button variant="secondary" icon={Settings}>
                  Manage
                </Button>
                <Button icon={Plus} onClick={() => setShowMilestoneForm(true)}>
                  Add Milestone
                </Button>
              </div>
            )}
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-background rounded-xl">
            <div>
              <div className="text-sm text-text-secondary mb-1">Project Owner</div>
              <div className="text-base font-semibold">{session?.user?.name || 'You'}</div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-1">Implementer</div>
              <ImplementerSelector
                projectId={id!}
                currentImplementerId={project.implementer_user_id}
                currentImplementerName={project.implementer_name}
                onUpdate={() => {
                  projectQuery.refetch();
                }}
                canEdit={userRole === 'project-owner' || userRole === 'admin'}
              />
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-1">Total Budget</div>
              <div className="text-base font-semibold">
                {formatCurrency(project.targetAmount, project.currency)}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary mb-1">Escrow Balance</div>
              <div className="text-base font-semibold text-primary">
                {formatCurrency(0, project.currency)} {/* Placeholder - would come from API */}
              </div>
            </div>
          </div>
        </div>

        {/* Funding Progress */}
        {displayStatus === 'funding' && (
          <div className="bg-surface rounded-card p-6 mb-6 border border-[#E0E0E0]">
            <h2 className="text-xl font-bold mb-4">Funding Progress</h2>
            <div className="mb-4">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-text-secondary">
                  {formatCurrency(project.currentAmount, project.currency)} raised
                </span>
                <span className="font-semibold">
                  {fundingProgress.toFixed(0)}% of {formatCurrency(project.targetAmount, project.currency)}
                </span>
              </div>
              <ProgressBar progress={fundingProgress} height={12} />
            </div>
            <Button icon={DollarSign} onClick={() => navigate(`/projects/${id}/fund`)}>
              Fund This Project
            </Button>
          </div>
        )}

        {/* Milestones */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold">Milestones</h2>
            <div className="text-sm text-text-secondary">
              {milestones.filter((m) => m.status === 'completed').length} of {milestones.length} completed
            </div>
          </div>

          {milestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              showActions={userRole === 'verifier'}
              onApprove={handleApproveMilestone}
              onReject={handleRejectMilestone}
              onViewEvidence={handleViewEvidence}
              currency={project.currency}
            />
          ))}
        </div>

        {showMilestoneForm && (
          <MilestoneForm
            projectId={id!}
            projectCurrency={project.currency}
            onSuccess={() => {
              setShowMilestoneForm(false);
              milestonesQuery.refetch();
              toast.success('Milestone created successfully!');
            }}
            onCancel={() => setShowMilestoneForm(false)}
          />
        )}
      </div>
    </div>
  );
}

