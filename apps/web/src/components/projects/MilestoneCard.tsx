import React from 'react';
import { CheckCircle, Clock, XCircle, Target, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { StatusPill } from '@/components/common/StatusPill';
import { formatCurrency } from '@/utils/formatCurrency';

interface Milestone {
  id: number | string;
  project_id?: number;
  projectId?: number;
  title: string;
  description?: string | null;
  amount: number;
  currency?: string;
  status: 'pending' | 'in_review' | 'completed' | 'rejected';
  due_date?: string | null;
  dueDate?: string;
  completed_date?: string | null;
  completedDate?: string;
  evidence?: string | null;
  evidence_metadata?: any;
  verifier_name?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

interface MilestoneCardProps {
  milestone: Milestone;
  onApprove?: (milestone: Milestone) => void;
  onReject?: (milestone: Milestone) => void;
  showActions?: boolean;
  onViewEvidence?: (milestone: Milestone) => void;
  currency?: string;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onApprove,
  onReject,
  showActions = false,
  onViewEvidence,
  currency = 'KES',
}) => {
  const getIcon = () => {
    if (milestone.status === 'completed') return CheckCircle;
    if (milestone.status === 'in_review') return Clock;
    if (milestone.status === 'rejected') return XCircle;
    return Target;
  };

  const getIconColor = () => {
    if (milestone.status === 'completed') return '#4CAF50';
    if (milestone.status === 'in_review') return '#FF9800';
    if (milestone.status === 'rejected') return '#F44336';
    return '#757575';
  };

  const getIconBg = () => {
    if (milestone.status === 'completed') return 'bg-[#E8F5E9]';
    if (milestone.status === 'in_review') return 'bg-[#FFF3E0]';
    if (milestone.status === 'rejected') return 'bg-[#FFEBEE]';
    return 'bg-primary-light';
  };

  const Icon = getIcon();
  const iconColor = getIconColor();
  const iconBg = getIconBg();

  // Map status for StatusPill
  const statusMap: Record<string, 'pending' | 'active' | 'success' | 'failed'> = {
    pending: 'pending',
    in_review: 'active',
    completed: 'success',
    rejected: 'failed',
  };
  const displayStatus = statusMap[milestone.status] || 'pending';

  return (
    <div className="bg-surface rounded-xl p-5 mb-3 border border-[#E0E0E0]">
      <div className="flex gap-4">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={24} color={iconColor} />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-base font-bold mb-1">{milestone.title}</h4>
              {milestone.description && (
                <p className="text-sm text-text-secondary">{milestone.description}</p>
              )}
            </div>
            <StatusPill status={displayStatus} />
          </div>

          <div className="flex gap-6 text-sm mb-3">
            <div>
              <span className="text-text-secondary">Amount: </span>
              <span className="font-semibold">{formatCurrency(milestone.amount, milestone.currency || currency)}</span>
            </div>
            <div>
              <span className="text-text-secondary">Due: </span>
              <span className="font-semibold">
                {milestone.dueDate || milestone.due_date 
                  ? new Date(milestone.dueDate || milestone.due_date!).toLocaleDateString()
                  : 'No deadline'}
              </span>
            </div>
            {milestone.completed_date || milestone.completedDate ? (
              <div>
                <span className="text-text-secondary">Completed: </span>
                <span className="font-semibold">
                  {new Date(milestone.completedDate || milestone.completed_date!).toLocaleDateString()}
                </span>
              </div>
            ) : null}
          </div>

          {milestone.evidence && (
            <div className="bg-primary-light p-3 rounded-lg mb-3 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-primary" />
                <span className="font-semibold">Evidence Submitted</span>
              </div>
              <div className="text-text-secondary text-xs mb-1">{milestone.evidence}</div>
              {milestone.evidence_metadata && typeof milestone.evidence_metadata === 'object' && (
                <div className="text-text-secondary text-xs mb-1">
                  {milestone.evidence_metadata.links && Array.isArray(milestone.evidence_metadata.links) && (
                    <div>Links: {milestone.evidence_metadata.links.length}</div>
                  )}
                </div>
              )}
              {onViewEvidence && (
                <button
                  onClick={() => onViewEvidence(milestone)}
                  className="bg-transparent border-none text-primary text-xs font-semibold cursor-pointer p-1 mt-1 hover:underline"
                >
                  View Evidence →
                </button>
              )}
            </div>
          )}
          {milestone.verifier_name && (
            <div className="text-xs text-text-secondary mb-2">
              Verified by: {milestone.verifier_name} {milestone.verified_at && `on ${new Date(milestone.verified_at).toLocaleDateString()}`}
            </div>
          )}

          {showActions && milestone.status === 'in_review' && (
            <div className="flex gap-2">
              <button
                onClick={() => onApprove && onApprove(milestone)}
                className="flex-1 px-3 py-2.5 bg-success text-white border-none rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[#45a049] transition-colors"
              >
                <ThumbsUp size={16} />
                Approve
              </button>
              <button
                onClick={() => onReject && onReject(milestone)}
                className="flex-1 px-3 py-2.5 bg-error text-white border-none rounded-lg font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-[#d32f2f] transition-colors"
              >
                <ThumbsDown size={16} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

