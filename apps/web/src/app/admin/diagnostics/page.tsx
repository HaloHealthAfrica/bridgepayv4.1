import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/StatusPill';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { Activity, CheckCircle, XCircle, Loader2, Database, Zap, Webhook } from 'lucide-react';
import useUser from '@/utils/useUser';

function DiagnosticsContent() {
  const { data: user, loading: userLoading } = useUser();
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userLoading && !user) {
      window.location.href = '/account/signin';
    }
  }, [user, userLoading]);

  const handleApiCall = async (endpoint: string, key: string, description: string) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        [key]: {
          success: true,
          data,
          description,
        },
      }));
    } catch (error: any) {
      console.error(`${description} error:`, error);
      setResults((prev) => ({
        ...prev,
        [key]: {
          success: false,
          error: error.message,
          description,
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCheckSecrets = async () => {
    setLoading((prev) => ({ ...prev, secrets: true }));
    try {
      const response = await fetch('/api/debug/secrets');
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        secrets: {
          success: true,
          data,
          description: 'Lemonade Secrets Check',
        },
      }));
    } catch (error: any) {
      console.error('Secrets check error:', error);
      setResults((prev) => ({
        ...prev,
        secrets: {
          success: false,
          error: error.message,
          description: 'Lemonade Secrets Check',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, secrets: false }));
    }
  };

  const handleLemonadeTrace = async () => {
    setLoading((prev) => ({ ...prev, lemonade: true }));
    try {
      const response = await fetch('/api/payments/lemonade/trace');
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        lemonade: {
          success: true,
          data,
          description: 'Lemonade Integration Test',
        },
      }));
    } catch (error: any) {
      console.error('Lemonade trace error:', error);
      setResults((prev) => ({
        ...prev,
        lemonade: {
          success: false,
          error: error.message,
          description: 'Lemonade Integration Test',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, lemonade: false }));
    }
  };

  const handleWebhookSnapshot = async () => {
    setLoading((prev) => ({ ...prev, webhookSnapshot: true }));
    try {
      const response = await fetch('/api/admin/metrics/overview');
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setResults((prev) => ({
        ...prev,
        webhookSnapshot: {
          success: true,
          data,
          description: 'Webhook Metrics Snapshot',
        },
      }));
    } catch (error: any) {
      console.error('Webhook snapshot error:', error);
      setResults((prev) => ({
        ...prev,
        webhookSnapshot: {
          success: false,
          error: error.message,
          description: 'Webhook Metrics Snapshot',
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, webhookSnapshot: false }));
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Admin Diagnostics</h1>
          <p className="text-text-secondary">Test system health and integrations</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            icon={Activity}
            onClick={() => handleApiCall('/api/health', 'health', 'Health Check')}
            disabled={loading.health}
            variant="secondary"
          >
            {loading.health ? 'Checking...' : 'Ping Health'}
          </Button>

          <Button
            icon={CheckCircle}
            onClick={() => handleApiCall('/api/debug/session', 'session', 'Session Check')}
            disabled={loading.session}
            variant="secondary"
          >
            {loading.session ? 'Checking...' : 'Check Session'}
          </Button>

          <Button
            icon={Database}
            onClick={handleCheckSecrets}
            disabled={loading.secrets}
            variant="secondary"
          >
            {loading.secrets ? 'Checking...' : 'Check Secrets'}
          </Button>

          <Button
            icon={Zap}
            onClick={handleLemonadeTrace}
            disabled={loading.lemonade}
            variant="secondary"
          >
            {loading.lemonade ? 'Checking...' : 'Test Lemonade'}
          </Button>

          <Button
            icon={Webhook}
            onClick={handleWebhookSnapshot}
            disabled={loading.webhookSnapshot}
            variant="secondary"
          >
            {loading.webhookSnapshot ? 'Checking...' : 'Webhook Snapshot'}
          </Button>
        </div>

        {/* Results Display */}
        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            {Object.entries(results).map(([key, result]) => (
              <div
                key={key}
                className="bg-surface rounded-card border border-[#E0E0E0] p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{result.description}</h3>
                  <StatusPill status={result.success ? 'success' : 'failed'} />
                </div>

                <div className="bg-background rounded-xl p-4 overflow-x-auto">
                  <pre className="text-sm text-text-secondary font-mono whitespace-pre-wrap break-words">
                    {result.success
                      ? JSON.stringify(result.data, null, 2)
                      : `Error: ${result.error}`}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}

        {Object.keys(results).length === 0 && (
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-12 text-center">
            <Activity size={48} className="text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">
              Click the buttons above to run diagnostics and see the results here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

