import React from 'react';
import { Bell, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useSession } from '@auth/create/react';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'customer';

  const getBreadcrumb = () => {
    if (location.pathname.startsWith('/projects')) return '/ Projects';
    if (location.pathname.startsWith('/merchant')) return '/ Merchant';
    if (location.pathname.startsWith('/implementer')) return '/ Implementer';
    if (location.pathname.startsWith('/kyc-verifier')) return '/ KYC Verifier';
    if (location.pathname.startsWith('/project-verifier')) return '/ Project Verifier';
    if (location.pathname.startsWith('/admin')) return '/ Admin';
    return '';
  };

  const roleLabels: Record<string, string> = {
    customer: 'Customer',
    merchant: 'Merchant',
    implementer: 'Implementer',
    'kyc-verifier': 'KYC Verifier',
    'project-verifier': 'Project Verifier',
    admin: 'Admin',
  };

  const breadcrumb = getBreadcrumb() || (roleLabels[userRole] ? ` / ${roleLabels[userRole]}` : '');

  return (
    <div className="bg-surface border-b border-[#E0E0E0] px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-lg">
          B
        </div>
        <span className="text-xl font-bold">Bridge</span>
        {breadcrumb && (
          <span className="text-text-secondary text-sm">{breadcrumb}</span>
        )}
      </div>
      <div className="flex gap-4 items-center">
        <select
          value={userRole}
          onChange={(e) => {
            // Role switching would need backend support
            console.log('Role switch:', e.target.value);
          }}
          className="px-3 py-2 rounded-lg border-2 border-primary text-sm font-semibold text-primary bg-white cursor-pointer"
        >
          <option value="customer">Customer</option>
          <option value="merchant">Merchant</option>
          <option value="project-owner">Project Owner</option>
          <option value="verifier">Verifier</option>
          <option value="admin">Admin</option>
        </select>
        <Bell size={24} className="text-text-secondary cursor-pointer" />
        <User
          size={24}
          className="text-text-secondary cursor-pointer"
          onClick={() => navigate('/account/signin')}
        />
      </div>
    </div>
  );
};

