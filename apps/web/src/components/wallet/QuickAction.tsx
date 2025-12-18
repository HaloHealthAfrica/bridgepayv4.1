import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: 'primary' | 'warning';
}

export const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  onClick,
  color = 'primary',
}) => {
  const bgColor = color === 'warning' ? 'bg-[#FFF3E0]' : 'bg-primary-light';
  const iconColor = color === 'warning' ? 'text-warning' : 'text-primary';

  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-card p-5 text-center cursor-pointer transition-all duration-200 border border-[#E0E0E0] flex-1 min-w-[150px] hover:-translate-y-1 hover:shadow-lg"
    >
      <div className={`${bgColor} rounded-xl p-4 inline-block mb-3`}>
        <Icon size={24} className={iconColor} />
      </div>
      <div className="text-sm font-semibold">{label}</div>
    </div>
  );
};

