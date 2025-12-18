import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'info';
  trend?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  color = 'primary',
  trend,
}) => {
  const colorConfig = {
    primary: { bg: 'bg-primary-light', icon: 'text-primary' },
    success: { bg: 'bg-[#E8F5E9]', icon: 'text-success' },
    warning: { bg: 'bg-[#FFF3E0]', icon: 'text-warning' },
    info: { bg: 'bg-[#E3F2FD]', icon: 'text-[#1565C0]' },
  };

  const config = colorConfig[color];

  return (
    <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${config.bg} rounded-lg p-2`}>
          <Icon size={20} className={config.icon} />
        </div>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <div className="text-4xl font-bold">{value}</div>
      {trend !== undefined && (
        <div
          className={`text-sm mt-1 ${
            trend > 0 ? 'text-success' : 'text-error'
          }`}
        >
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
        </div>
      )}
    </div>
  );
};

