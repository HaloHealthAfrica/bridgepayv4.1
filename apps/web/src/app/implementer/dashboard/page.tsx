import React from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProgressBar } from '@/components/projects/ProgressBar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import {
  Briefcase,
  Target,
  CheckCircle,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

function ImplementerDashboardContent() {
  const navigate = useNavigate();

  // Fetch implementer projects
  const projectsQuery = useQuery({
    queryKey: ['implementer-projects'],
    queryFn: async () => {
      const res = await fetch('/api/implementer/projects');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch projects');
      }
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch projects');
      }
      return data;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const activeProjects = projectsQuery.data?.items || [];
  const stats = projectsQuery.data?.stats || {
    activeProjects: 0,
    pendingMilestones: 0,
    completedThisMonth: 0,
    earnedThisMonth: 0,
    currency: 'KES', // Default currency, should come from API
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Implementer Dashboard 💼</h1>
          <p className="text-text-secondary">Manage your project work and deliverables</p>
        </div>

        {/* Stats Grid */}
        {projectsQuery.isLoading ? (
          <div className="text-center py-8 text-text-secondary mb-8">Loading stats...</div>
        ) : projectsQuery.error ? (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-8 text-error">
            Failed to load stats: {(projectsQuery.error as Error).message}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Briefcase} label="Active Projects" value={stats.activeProjects?.toString() || '0'} color="primary" />
            <StatCard icon={Target} label="Pending Milestones" value={stats.pendingMilestones?.toString() || '0'} color="warning" />
            <StatCard icon={CheckCircle} label="Completed This Month" value={stats.completedThisMonth?.toString() || '0'} color="success" />
            <StatCard
              icon={DollarSign}
              label="Earned This Month"
              value={formatCurrency(stats.earnedThisMonth || 0, stats.currency || 'KES')}
              color="success"
            />
          </div>
        )}

        {/* Action Items */}
        <div className="bg-[#FFF3E0] rounded-card p-5 mb-6 border-2 border-warning">
          <div className="flex items-center gap-3 flex-wrap">
            <AlertCircle size={24} className="text-warning" />
            <div className="flex-1 min-w-[200px]">
              <div className="font-bold text-base mb-1">2 Milestones Due This Week</div>
              <div className="text-sm text-text-secondary">
                Submit evidence to release escrow funds
              </div>
            </div>
            <Button onClick={() => navigate('/implementer/milestones')}>View</Button>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <h2 className="text-lg font-bold mb-4">Active Projects</h2>
          {projectsQuery.isLoading ? (
            <div className="text-center py-8 text-text-secondary">Loading projects...</div>
          ) : projectsQuery.error ? (
            <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
              Failed to load projects: {(projectsQuery.error as Error).message}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <Briefcase size={48} className="text-text-secondary mx-auto mb-4" />
              <div className="text-base">No active projects assigned</div>
            </div>
          ) : (
            activeProjects.map((project: any) => (
            <div
              key={project.id}
              className="p-5 bg-background rounded-xl mb-3"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-base mb-1">{project.title}</div>
                  <div className="text-sm text-text-secondary">Client: {project.client}</div>
                </div>
                <StatusPill status="active" />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <ProgressBar progress={project.progress} height={8} />
              </div>
              <div className="flex gap-6 text-sm mb-3 flex-wrap">
                <div>
                  <span className="text-text-secondary">In Escrow: </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(project.escrow, project.currency || 'KES')}
                  </span>
                </div>
                <div>
                  <span className="text-text-secondary">Due: </span>
                  <span className="font-semibold">{project.due}</span>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/implementer/projects/${project.id}/submit-evidence`)}
              >
                Submit Milestone Evidence
              </Button>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

