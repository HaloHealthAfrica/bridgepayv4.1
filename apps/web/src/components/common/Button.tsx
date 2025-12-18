import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  fullWidth,
  disabled,
  icon: Icon,
  type = 'button',
}) => {
  const baseClasses =
    'px-6 py-4 rounded-button font-semibold transition-all duration-200 flex items-center justify-center gap-2';

  const variantClasses = {
    primary:
      'bg-primary text-white hover:bg-[#00695C] shadow-sm hover:shadow-md',
    secondary:
      'bg-white text-primary border-2 border-primary hover:bg-primary-light',
    danger: 'bg-error text-white hover:bg-[#D32F2F]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
};

