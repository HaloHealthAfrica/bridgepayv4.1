import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CurrencySelector } from '@/components/CurrencySelector';
import { Button } from '@/components/common/Button';

interface MilestoneFormProps {
  projectId: string | number;
  projectCurrency?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MilestoneForm: React.FC<MilestoneFormProps> = ({
  projectId,
  projectCurrency = 'KES',
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    currency: projectCurrency,
    due_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        title: formData.title.trim(),
        amount: Number(formData.amount),
        currency: formData.currency,
      };

      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }

      if (formData.due_date) {
        payload.due_date = formData.due_date;
      }

      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create milestone');
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to create milestone');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create milestone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#E0E0E0]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Milestone</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-background rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 mb-4 text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Complete UI Design"
                required
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what needs to be completed..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-2">
                  Currency *
                </label>
                <CurrencySelector
                  value={formData.currency}
                  onChange={(val) => setFormData({ ...formData, currency: val })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              disabled={loading || !formData.title || !formData.amount}
            >
              {loading ? 'Creating...' : 'Create Milestone'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

