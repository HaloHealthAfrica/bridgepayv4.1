import React from 'react';

interface StatusPillProps {
  status: 'pending' | 'success' | 'failed' | 'verified' | 'rejected' | 'active' | 'suspended' | 'in_review' | 'funded' | 'funding' | 'completed' | 'approved' | 'processing';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', label: 'Pending' },
    success: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Success' },
    failed: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Failed' },
    verified: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Verified' },
    rejected: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Rejected' },
    active: { bg: 'bg-[#E3F2FD]', text: 'text-[#1565C0]', label: 'Active' },
    suspended: { bg: 'bg-[#FFEBEE]', text: 'text-[#C62828]', label: 'Suspended' },
    in_review: { bg: 'bg-[#F3E5F5]', text: 'text-[#6A1B9A]', label: 'In Review' },
    funded: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Funded' },
    funding: { bg: 'bg-[#FFF3E0]', text: 'text-[#E65100]', label: 'Funding' },
    completed: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Completed' },
    approved: { bg: 'bg-[#E8F5E9]', text: 'text-[#2E7D32]', label: 'Approved' },
    processing: { bg: 'bg-[#F3E5F5]', text: 'text-[#6A1B9A]', label: 'Processing' },
  };

  const config = configs[status] || configs.pending;

  return (
    <span
      className={`${config.bg} ${config.text} px-3 py-1 rounded-xl text-xs font-semibold`}
    >
      {config.label}
    </span>
  );
};

