import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ArrowLeft, Play, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import useUser from '@/utils/useUser';
import { useNavigate } from 'react-router';

export default function AdminPaymentsTestHarnessPage() {
  const { data: user, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/account/signin';
      }
    }
  }, [user, userLoading]);

  const runMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      setReport(null);
      setStartedAt(Date.now());
      const res = await fetch('/api/admin/payments/test-harness', {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          `Test harness failed [${res.status}] ${res.statusText} ${text}`,
        );
      }
      const json = await res.json();
      return json;
    },
    onSuccess: (data) => {
      setReport(data?.report || null);
      setDurationMs(Date.now() - (startedAt || Date.now()));
      toast.success('Test suite completed');
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 50);
    },
    onError: (e: any) => {
      console.error(e);
      setError(e?.message || 'Run failed');
      setDurationMs(null);
      toast.error(e?.message || 'Test suite failed');
    },
  });

  const busy = runMutation.isPending;

  const stepAnchor = (step: any, idx: number) => {
    const slug = (step?.name || `step-${idx}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `step-${idx}-${slug}`;
  };

  const StepBlock = ({ step, idx }: { step: any; idx: number }) => {
    const pass = step?.pass;
    const anchorId = stepAnchor(step, idx);
    return (
      <div
        id={anchorId}
        className={`border-2 rounded-xl p-6 ${
          pass
            ? 'border-success bg-[#E8F5E9]'
            : 'border-error bg-[#FFEBEE]'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-lg uppercase">{step?.name}</div>
          <StatusPill status={pass ? 'success' : 'failed'} />
        </div>
        <pre className="text-xs overflow-auto bg-surface border border-[#E0E0E0] rounded-xl p-4 max-h-[300px] whitespace-pre-wrap">
          {JSON.stringify(step, null, 2)}
        </pre>
        <div className="mt-3 text-right">
          <a
            href="#top"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Back to top
          </a>
        </div>
      </div>
    );
  };

  const StepsIndex = ({ steps }: { steps: any[] }) => {
    if (!steps?.length) return null;
    const passCount = steps.filter((s) => s?.pass).length;
    const total = steps.length;
    return (
      <div className="bg-surface rounded-card border border-[#E0E0E0] p-6" id="top">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg">Run Summary</div>
          <div className="text-sm font-semibold">
            {passCount}/{total} passed
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((s, idx) => {
            const href = `#${stepAnchor(s, idx)}`;
            const pass = s?.pass;
            return (
              <a
                key={idx}
                href={href}
                className={`flex items-center justify-between border-2 rounded-xl px-4 py-3 text-sm transition-colors ${
                  pass
                    ? 'border-success bg-[#E8F5E9] hover:bg-[#C8E6C9]'
                    : 'border-error bg-[#FFEBEE] hover:bg-[#FFCDD2]'
                }`}
              >
                <span className="truncate pr-2 font-semibold">{s?.name}</span>
                {pass ? (
                  <CheckCircle size={16} className="text-success flex-shrink-0" />
                ) : (
                  <XCircle size={16} className="text-error flex-shrink-0" />
                )}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Payments Test Harness</h1>
            <p className="text-text-secondary">
              Run the full V0 payment validation suite directly on this server
            </p>
          </div>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/admin/payments')}>
            Back
          </Button>
        </div>

        <div className="bg-surface rounded-card border border-[#E0E0E0] p-6 mb-6">
          <p className="text-text mb-4">
            This uses internal API calls and SQL checks. Admin only.
          </p>
          {error && (
            <div className="mb-4 bg-[#FFEBEE] border border-error rounded-xl p-4 text-error">
              {error}
            </div>
          )}
          <Button
            icon={Play}
            onClick={() => runMutation.mutate()}
            disabled={busy}
            fullWidth
          >
            {busy ? 'Running...' : 'Run Test Suite'}
          </Button>
          {durationMs != null && (
            <div className="mt-4 text-sm text-text-secondary text-center">
              Duration: {Math.round(durationMs / 1000)}s
            </div>
          )}
        </div>

        {/* Summary/Index */}
        {report?.steps?.length ? (
          <div className="mb-6">
            <StepsIndex steps={report.steps} />
          </div>
        ) : null}

        {/* Results */}
        {report && (
          <div ref={resultsRef} className="grid grid-cols-1 gap-6">
            {(report.steps || []).map((s: any, idx: number) => (
              <StepBlock key={idx} step={s} idx={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

