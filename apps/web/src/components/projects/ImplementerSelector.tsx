import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { toast } from 'sonner';

interface Implementer {
  id: string;
  name: string;
  email: string;
}

interface ImplementerSelectorProps {
  projectId: string | number;
  currentImplementerId?: string | null;
  currentImplementerName?: string | null;
  onUpdate: () => void;
  canEdit: boolean;
}

export const ImplementerSelector: React.FC<ImplementerSelectorProps> = ({
  projectId,
  currentImplementerId,
  currentImplementerName,
  onUpdate,
  canEdit,
}) => {
  const [showSelector, setShowSelector] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available implementers
  const { data: implementersData, isLoading: loadingImplementers } = useQuery({
    queryKey: ['admin', 'implementers'],
    queryFn: async () => {
      const res = await fetch('/api/admin/implementers');
      if (!res.ok) {
        throw new Error('Failed to fetch implementers');
      }
      const data = await res.json();
      return data.ok ? data.implementers : [];
    },
    enabled: canEdit && showSelector,
  });

  const assignMutation = useMutation({
    mutationFn: async (implementerId: string) => {
      const res = await fetch(`/api/projects/${projectId}/assign-implementer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implementer_user_id: implementerId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign implementer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onUpdate();
      setShowSelector(false);
      toast.success('Implementer assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign implementer');
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/assign-implementer`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to remove implementer');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onUpdate();
      toast.success('Implementer removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove implementer');
    },
  });

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2">
        <User size={16} className="text-text-secondary" />
        <span className="text-sm">
          {currentImplementerName || 'Not Assigned'}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <User size={16} className="text-text-secondary" />
          <span className="text-sm font-semibold">
            {currentImplementerName || 'Not Assigned'}
          </span>
        </div>
        {currentImplementerId && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing...' : 'Remove'}
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSelector(!showSelector)}
        >
          {currentImplementerId ? 'Change' : 'Assign'}
        </Button>
      </div>

      {showSelector && (
        <div className="absolute top-full left-0 mt-2 bg-surface border border-[#E0E0E0] rounded-xl shadow-lg z-50 min-w-[300px] max-h-[400px] overflow-y-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Select Implementer</h3>
              <button
                onClick={() => setShowSelector(false)}
                className="p-1 hover:bg-background rounded"
              >
                <X size={16} />
              </button>
            </div>

            {loadingImplementers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : implementersData && implementersData.length > 0 ? (
              <div className="space-y-2">
                {implementersData.map((impl: Implementer) => (
                  <button
                    key={impl.id}
                    onClick={() => assignMutation.mutate(impl.id)}
                    disabled={assignMutation.isPending || impl.id === currentImplementerId}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      impl.id === currentImplementerId
                        ? 'bg-primary-light border-primary'
                        : 'border-[#E0E0E0] hover:bg-background'
                    } ${assignMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">{impl.name}</div>
                    <div className="text-sm text-text-secondary">{impl.email}</div>
                    {impl.id === currentImplementerId && (
                      <div className="text-xs text-primary mt-1">Current</div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary text-sm">
                No implementers available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

