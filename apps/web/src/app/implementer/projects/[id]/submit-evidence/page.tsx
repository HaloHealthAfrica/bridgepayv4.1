import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Upload, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';

function SubmitEvidenceContent() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const milestoneId = searchParams.get('milestoneId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState(['']);

  // Fetch milestone data
  const milestoneQuery = useQuery({
    queryKey: ['milestone', projectId, milestoneId],
    queryFn: async () => {
      if (!milestoneId || !projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch milestone');
      }
      const data = await res.json();
      return data.ok ? data.milestone : null;
    },
    enabled: !!milestoneId && !!projectId,
  });

  const milestone = milestoneQuery.data;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!milestoneId || !projectId) {
        throw new Error('Missing milestone or project ID');
      }
      if (!description.trim()) {
        throw new Error('Please provide evidence description');
      }

      const evidence_metadata: any = {};
      const validLinks = links.filter(link => link.trim());
      if (validLinks.length > 0) {
        evidence_metadata.links = validLinks;
      }

      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}/submit-evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence: description.trim(),
          evidence_metadata: Object.keys(evidence_metadata).length > 0 ? evidence_metadata : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit evidence');
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.message || 'Failed to submit evidence');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestone', projectId, milestoneId] });
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] });
      toast.success('Evidence submitted for verification!');
      navigate('/implementer/dashboard');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit evidence');
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const addLink = () => {
    setLinks([...links, '']);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/implementer/dashboard')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Submit Milestone Evidence</h1>
          <p className="text-text-secondary">Upload deliverables for verification</p>
        </div>

        {milestoneQuery.isLoading ? (
          <div className="text-center py-12 text-text-secondary">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Loading milestone...
          </div>
        ) : milestoneQuery.error || !milestone ? (
          <div className="bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
            {milestoneQuery.error ? (milestoneQuery.error as Error).message : 'Milestone not found. Please provide milestoneId in URL.'}
          </div>
        ) : (
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="bg-primary-light rounded-xl p-5 mb-6">
              <div className="font-bold text-base mb-2">{milestone.title}</div>
              {milestone.description && (
                <div className="text-sm text-text-secondary mb-3">{milestone.description}</div>
              )}
              <div className="flex gap-6 text-sm flex-wrap">
                <div>
                  <span className="text-text-secondary">Milestone Value: </span>
                  <span className="font-semibold">{formatCurrency(milestone.amount, milestone.currency || 'KES')}</span>
                </div>
                {milestone.due_date && (
                  <div>
                    <span className="text-text-secondary">Due Date: </span>
                    <span className="font-semibold">{new Date(milestone.due_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-semibold">Evidence Description *</label>
              <textarea
                placeholder="Describe what you've completed and where to find the deliverables..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-4 text-base border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary font-inherit resize-y"
                required
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block font-semibold">Links (Optional)</label>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={addLink}
                >
                  Add Link
                </Button>
              </div>
              {links.map((link, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="GitHub repo, staging URL, etc."
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-[#E0E0E0] rounded-xl focus:outline-none focus:border-primary"
                  />
                  {links.length > 1 && (
                    <button
                      onClick={() => removeLink(index)}
                      className="p-3 text-error hover:bg-[#FFEBEE] rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-[#E8F5E9] rounded-xl p-4 mb-6 text-sm">
              <div className="font-semibold mb-1 text-success flex items-center gap-2">
                <CheckCircle size={16} />
                What happens next?
              </div>
              <div className="text-text-secondary">
                A verifier will review your submission within 48 hours. Once approved,{' '}
                {formatCurrency(milestone.amount, milestone.currency || 'KES')} will be released from escrow to your wallet.
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/implementer/dashboard')}
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !description.trim()}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubmitEvidencePage() {
  return (
    <ProtectedRoute requiredRole={ROLES.IMPLEMENTER}>
      <SubmitEvidenceContent />
    </ProtectedRoute>
  );
}
