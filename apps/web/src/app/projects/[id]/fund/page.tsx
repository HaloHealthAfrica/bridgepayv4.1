import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DollarSign, Lock } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';

function FundProjectContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');

  // Fetch project
  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to load project');
      const response = await res.json();
      // API returns { ok: true, data: {...} } format
      return response.data || response;
    },
  });

  const project = projectQuery.data;

  if (projectQuery.isLoading || !project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <div className="text-text-secondary">Loading...</div>
        </div>
      </div>
    );
  }

  const remaining = project.targetAmount - project.currentAmount;
  const quickAmounts = [10000, 50000, 100000, remaining].filter((a) => a > 0);

  const handleFund = () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amountNum > remaining) {
      toast.error(`Amount cannot exceed remaining ${formatCurrency(remaining, project.currency)}`);
      return;
    }
    // In real app, this would call the contribute API
    toast.success(`Funding successful! Funds moved to project escrow.`);
    navigate(`/projects/${id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Project
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fund Project</h1>
          <p className="text-text-secondary">{project.title}</p>
        </div>

        <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
          <div className="bg-primary-light rounded-xl p-5 mb-6">
            <div className="text-sm text-text-secondary mb-2">Funding Goal</div>
            <div className="text-4xl font-bold text-primary mb-3">
              {formatCurrency(project.targetAmount, project.currency)}
            </div>
            <div className="text-sm">
              <span className="font-semibold">{formatCurrency(remaining, project.currency)}</span> remaining
            </div>
          </div>

          <div className="mb-6">
            <label className="block mb-2 font-semibold">Investment Amount ({project.currency})</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              max={remaining}
              className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl mb-4 focus:outline-none focus:border-primary"
            />

            <div className="flex gap-2 flex-wrap">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className="px-4 py-2.5 border-2 border-primary rounded-lg bg-white text-primary font-semibold text-sm cursor-pointer hover:bg-primary-light transition-colors"
                >
                  {amt === remaining ? 'Full Amount' : formatCurrency(amt, project.currency)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#E3F2FD] rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Lock size={20} className="text-[#1565C0] flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-1 text-[#1565C0]">Secure Escrow</div>
                <div className="text-sm text-[#424242]">
                  Your funds are held in escrow and released to the implementer only when milestones are verified and approved
                </div>
              </div>
            </div>
          </div>

          <Button
            icon={DollarSign}
            fullWidth
            onClick={handleFund}
            disabled={!amount || Number(amount) <= 0}
          >
            Fund via M-Pesa
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FundProjectPage() {
  return (
    <ProtectedRoute>
      <FundProjectContent />
    </ProtectedRoute>
  );
}

