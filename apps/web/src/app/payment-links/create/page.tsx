import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { CurrencySelector } from '@/components/CurrencySelector';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CreatePaymentLinkPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'KES',
    description: '',
    expiresIn: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const body: any = {
        amount: Number(data.amount),
        currency: data.currency,
        description: data.description || null,
      };

      if (data.expiresIn) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + Number(data.expiresIn));
        body.expires_at = expiresAt.toISOString();
      }

      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create payment link');
      }

      const data = await res.json();
      // API returns { ok: true, id, code, ... } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to create payment link');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Payment link created successfully!');
      navigate('/payment-links');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create payment link');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/payment-links')}
            className="mb-4"
          >
            Back to Links
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create Payment Link</h1>
          <p className="text-text-secondary">
            Generate a shareable link for customers to pay you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-card p-6 border border-[#E0E0E0] space-y-6">
          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Amount *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Currency *
            </label>
            <CurrencySelector
              value={formData.currency}
              onChange={(currency) =>
                setFormData({ ...formData, currency })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary resize-y"
              rows={3}
              placeholder="Payment for..."
              maxLength={500}
            />
            <p className="text-xs text-text-secondary mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Expires In (days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.expiresIn}
              onChange={(e) =>
                setFormData({ ...formData, expiresIn: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
              placeholder="Leave empty for no expiration"
            />
            <p className="text-xs text-text-secondary mt-1">
              Link will expire after the specified number of days
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <Button
              type="submit"
              fullWidth
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Payment Link'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/payment-links')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

