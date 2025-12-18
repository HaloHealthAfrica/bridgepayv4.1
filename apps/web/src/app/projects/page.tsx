import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@auth/create/react';
import { Navigation } from '@/components/common/Navigation';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Plus, Briefcase, Lock, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';

function ProjectsContent() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'funding' | 'completed'>('all');
  const [showCreate, setShowCreate] = useState(false);

  const userRole = session?.user?.role || 'project-owner';

  // Load projects
  const projectsQuery = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch projects: ${res.statusText}`);
      }
      const data = await res.json();
      // API returns { ok: true, items, pagination } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch projects');
      }
      return data.items || [];
    },
  });

  const projects = projectsQuery.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p: any) => p.status === 'active').length;
    const totalEscrow = projects.reduce((sum: number, p: any) => {
      // Use current_amount as escrow (funds raised)
      return sum + (Number(p.current_amount) || 0);
    }, 0);
    const completedMilestones = projects.reduce((sum: number, p: any) => {
      return sum + (p.completedMilestones || 0);
    }, 0);
    const totalMilestones = projects.reduce((sum: number, p: any) => {
      return sum + (p.totalMilestones || 0);
    }, 0);

    // Get primary currency (most common currency in projects)
    const currencyCounts: Record<string, number> = {};
    projects.forEach((p: any) => {
      const currency = p.currency || 'KES';
      currencyCounts[currency] = (currencyCounts[currency] || 0) + 1;
    });
    const primaryCurrency = Object.keys(currencyCounts).reduce((a, b) => 
      currencyCounts[a] > currencyCounts[b] ? a : b, 'KES'
    );

    return {
      activeProjects,
      totalEscrow,
      completedMilestones,
      totalMilestones,
      currency: primaryCurrency,
    };
  }, [projects]);

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create project');
      }
      const data = await res.json();
      // API returns { ok: true, id, ... } format
      if (!data.ok) {
        throw new Error(data.message || 'Failed to create project');
      }
      return data;
    },
    onSuccess: () => {
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create project');
    },
  });

  const getPageTitle = () => {
    if (userRole === 'verifier') return 'Projects to Verify';
    if (userRole === 'funder') return 'Investment Opportunities';
    return 'My Projects';
  };

  const getPageDescription = () => {
    if (userRole === 'verifier') return 'Review and approve project milestones';
    if (userRole === 'funder') return 'Fund projects and track progress';
    return 'Create, manage and track your projects';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{getPageTitle()}</h1>
            <p className="text-text-secondary">{getPageDescription()}</p>
          </div>
          {userRole === 'project-owner' && (
            <Button icon={Plus} onClick={() => navigate('/projects/create')}>
              Create Project
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-primary-light rounded-lg p-2">
                <Briefcase size={20} className="text-primary" />
              </div>
              <span className="text-sm text-text-secondary">Active Projects</span>
            </div>
            <div className="text-4xl font-bold">{stats.activeProjects}</div>
          </div>

          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-[#FFF3E0] rounded-lg p-2">
                <Lock size={20} className="text-warning" />
              </div>
              <span className="text-sm text-text-secondary">In Escrow</span>
            </div>
            <div className="text-4xl font-bold text-primary">
              {formatCurrency(stats.totalEscrow, stats.currency || 'KES')}
            </div>
          </div>

          <div className="bg-surface rounded-card p-6 border border-[#E0E0E0]">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-[#E8F5E9] rounded-lg p-2">
                <CheckCircle size={20} className="text-success" />
              </div>
              <span className="text-sm text-text-secondary">Completed Milestones</span>
            </div>
            <div className="text-4xl font-bold">
              {stats.completedMilestones}/{stats.totalMilestones}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['All', 'Active', 'Funding', 'Completed'].map((tab) => {
            const tabValue = tab.toLowerCase() as typeof statusFilter;
            const isActive = (tab === 'All' && statusFilter === 'all') ||
              (tab !== 'All' && statusFilter === tabValue);
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab === 'All' ? 'all' : tabValue)}
                className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'border-2 border-[#E0E0E0] bg-white text-text'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Projects List */}
        {projectsQuery.isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface rounded-card p-6 border border-[#E0E0E0] animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface rounded-card p-12 text-center border border-[#E0E0E0]">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-text-secondary mb-6">
              Start your first project to organize work, track progress, and collaborate.
            </p>
            {userRole === 'project-owner' && (
              <Button icon={Plus} onClick={() => navigate('/projects/create')}>
                Create Your First Project
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project: any) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  escrowAmount: project.escrowAmount || 0,
                  totalMilestones: project.totalMilestones || 0,
                  completedMilestones: project.completedMilestones || 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

