import React from 'react';
import { useNavigate } from 'react-router';
import { StatusPill } from '@/components/common/StatusPill';
import { ProgressBar } from '@/components/projects/ProgressBar';
import { formatCurrency } from '@/utils/formatCurrency';

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description?: string | null;
    target_amount: number;
    current_amount: number;
    currency: string;
    status: string;
    category?: string | null;
    deadline?: string | null;
    escrowAmount?: number;
    totalMilestones?: number;
    completedMilestones?: number;
    timeline?: string;
  };
  onClick?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const navigate = useNavigate();
  const fundingProgress = project.target_amount > 0
    ? Math.min(100, (project.current_amount / project.target_amount) * 100)
    : 0;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/projects/${project.id}`);
    }
  };

  // Map backend status to frontend status
  const statusMap: Record<string, 'pending' | 'active' | 'success' | 'failed'> = {
    draft: 'pending',
    active: 'active',
    completed: 'success',
    cancelled: 'failed',
    funding: 'pending',
  };
  const displayStatus = statusMap[project.status] || 'pending';

  return (
    <div
      onClick={handleClick}
      className="bg-surface rounded-card p-6 mb-4 cursor-pointer transition-all duration-200 border border-[#E0E0E0] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-2">{project.title}</h3>
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">
            {project.description || 'No description'}
          </p>
        </div>
        <StatusPill status={displayStatus} />
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2 text-sm">
          <span className="text-text-secondary">Funding Progress</span>
          <span className="font-semibold">
            {formatCurrency(project.current_amount, project.currency)} / {formatCurrency(project.target_amount, project.currency)}
          </span>
        </div>
        <ProgressBar progress={fundingProgress} />
      </div>

      <div className="flex gap-6 text-sm">
        {project.totalMilestones !== undefined && (
          <div>
            <div className="text-text-secondary mb-1">Milestones</div>
            <div className="font-semibold">
              {project.completedMilestones || 0}/{project.totalMilestones || 0}
            </div>
          </div>
        )}
        {project.escrowAmount !== undefined && (
          <div>
            <div className="text-text-secondary mb-1">Escrow</div>
            <div className="font-semibold text-primary">
              {formatCurrency(project.escrowAmount, project.currency)}
            </div>
          </div>
        )}
        {project.timeline && (
          <div>
            <div className="text-text-secondary mb-1">Timeline</div>
            <div className="font-semibold">{project.timeline}</div>
          </div>
        )}
        {project.deadline && !project.timeline && (
          <div>
            <div className="text-text-secondary mb-1">Deadline</div>
            <div className="font-semibold">{project.deadline}</div>
          </div>
        )}
      </div>
    </div>
  );
};

