import React from 'react';

interface ProgressBarProps {
  progress: number;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, height = 8 }) => {
  return (
    <div
      className="w-full bg-[#E0E0E0] rounded-full overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full bg-primary transition-all duration-300 rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
};

