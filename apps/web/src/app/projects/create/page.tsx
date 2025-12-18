import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { CurrencySelector } from '@/components/CurrencySelector';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

function CreateProjectContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    timeline: '',
    target_amount: '',
    currency: 'KES',
  });

  const createProject = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create project');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created! Now add milestones.');
      navigate('/projects');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({
      title: formData.title.trim(),
      description: formData.description || undefined,
      target_amount: Number(formData.target_amount),
      currency: formData.currency || 'KES',
      category: formData.category || undefined,
      deadline: formData.timeline || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/projects')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Projects
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
          <p className="text-text-secondary">Set up your project with milestones and escrow</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-surface rounded-card p-8 border border-[#E0E0E0]">
            <div className="mb-6">
              <label className="block mb-2 font-semibold">Project Title</label>
              <input
                type="text"
                placeholder="e.g. E-Commerce Website Development"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-semibold">Description</label>
              <textarea
                placeholder="Describe what you want to build..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-inherit resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 font-semibold">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                >
                  <option value="">Select category</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Enterprise Software">Enterprise Software</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-semibold">Timeline</label>
                <input
                  type="text"
                  placeholder="e.g. 12 weeks"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-2 font-semibold">Currency</label>
                <CurrencySelector value={formData.currency} onChange={(val) => setFormData({ ...formData, currency: val })} />
              </div>
              <div>
                <label className="block mb-2 font-semibold">Total Budget ({formData.currency})</label>
                <input
                  type="number"
                  placeholder="500000"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  required
                  min="0"
                  className="w-full px-4 py-4 text-2xl font-bold border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="bg-primary-light rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Shield size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold mb-1">Escrow Protection</div>
                  <div className="text-sm text-text-secondary">
                    Funds are held securely in escrow and released only when milestones are approved by verifiers
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/projects')}
                type="button"
              >
                Cancel
              </Button>
              <Button
                fullWidth
                type="submit"
                disabled={createProject.isPending}
              >
                {createProject.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateProjectPage() {
  return (
    <ProtectedRoute requiredRole={[ROLES.PROJECT_OWNER, ROLES.ADMIN]}>
      <CreateProjectContent />
    </ProtectedRoute>
  );
}

