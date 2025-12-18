import React, { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/common/Navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import useUser from '@/utils/useUser';
import { DEFAULTS } from './constants';
import {
  useProbeQuery,
  useSessionQuery,
  useIsAdmin,
  useRecentPaymentsQuery,
} from './hooks/usePaymentsQueries';
import {
  useRunTraceMutation,
  useCheckStatusMutation,
  useCreatePaymentMutation,
  useStatusSyncMutation,
  useViewPaymentMutation,
} from './hooks/usePaymentsMutations';
import { DiagnosticsBar } from './components/DiagnosticsBar';
import { ConnectivityDisplay } from './components/ConnectivityDisplay';
import { ConfigWarning } from './components/ConfigWarning';
import { QuickTest } from './components/QuickTest';
import { RecentPayments } from './components/RecentPayments';
import { TraceControls } from './components/TraceControls';
import { ResultsPanel } from './components/ResultsPanel';
import { Loader2 } from 'lucide-react';

function AdminPaymentsContent() {
  const queryClient = useQueryClient();
  const { data: user, loading: userLoading } = useUser();
  const [action, setAction] = useState('stk_push');
  const [mode, setMode] = useState('relay');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(DEFAULTS.stk_push, null, 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [lastCurl, setLastCurl] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      if (typeof window !== 'undefined') {
        window.location.href = '/account/signin';
      }
    }
  }, [user, userLoading]);

  const probeQuery = useProbeQuery();
  const sessionQuery = useSessionQuery();
  const isAdmin = useIsAdmin(sessionQuery);
  const recentQuery = useRecentPaymentsQuery(isAdmin);

  useEffect(() => {
    setPayloadText(JSON.stringify(DEFAULTS[action as keyof typeof DEFAULTS], null, 2));
    setError(null);
  }, [action]);

  const parsePayload = () => {
    try {
      const parsed = JSON.parse(payloadText);
      if (parsed === null || typeof parsed !== 'object') {
        setError('The payload must be valid JSON');
        return null;
      }
      setError(null);
      return parsed;
    } catch (e) {
      setError('The payload must be valid JSON');
      return null;
    }
  };

  const scrollResultsIntoView = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const runTraceMutation = useRunTraceMutation({
    setResults,
    setLastRunAt,
    setLastCurl,
    scrollResultsIntoView,
    mode,
  });

  const checkStatusMutation = useCheckStatusMutation({
    setResults,
    setLastRunAt,
    setLastCurl,
    scrollResultsIntoView,
  });

  // Quick Test state
  const [qtKind, setQtKind] = useState('stk_push');
  const [qtAmount, setQtAmount] = useState(2);
  const [qtPhone, setQtPhone] = useState('0712345678');
  const [qtWallet, setQtWallet] = useState('11391837');
  const [qtOrderRef, setQtOrderRef] = useState(() => `ref-${Date.now()}`);
  const [qtResult, setQtResult] = useState<any>(null);
  const [connectivity, setConnectivity] = useState<any>(null);
  const [qtPaymentId, setQtPaymentId] = useState('');

  const createPaymentMutation = useCreatePaymentMutation({
    setQtResult,
    setQtPaymentId,
    queryClient,
  });

  const statusSyncMutation = useStatusSyncMutation({ setQtResult });

  const viewPaymentMutation = useViewPaymentMutation({
    setResults,
    setLastRunAt,
    scrollResultsIntoView,
  });

  const handleConnectivity = async () => {
    try {
      const [connRes, ipRes] = await Promise.all([
        fetch('/api/payments/lemonade/connectivity'),
        fetch('/api/payments/lemonade/egress-ip'),
      ]);
      const conn = await connRes.json().catch(() => null);
      const ip = await ipRes.json().catch(() => null);
      setConnectivity({ ...(conn || {}), egressIp: ip || null });
    } catch (e) {
      console.error('connectivity error', e);
      setConnectivity({ ok: false, error: String((e as Error)?.message || e) });
    }
  };

  const handleRelayRediscover = async () => {
    try {
      await fetch('/api/payments/lemonade/relay/clear', { method: 'POST' });
      await fetch('/api/payments/lemonade/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transaction_status',
          payload: { ping: 1 },
          forceMode: 'relay',
        }),
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['lemonade-probe'] });
    } catch (e) {
      console.error('rediscover error', e);
    }
  };

  const handleForceDirect = async () => {
    try {
      await fetch('/api/payments/lemonade/relay/breaker', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['lemonade-probe'] });
    } catch (e) {
      console.error('force direct error', e);
    }
  };

  function validateQuickTest(kind: string, f: any) {
    if (!f.amount || Number(f.amount) <= 0)
      return 'Amount must be greater than 0';
    if (!f.orderRef || !String(f.orderRef).trim())
      return 'Order Reference is required';
    if (kind === 'stk_push' && (!f.phone || !String(f.phone).trim()))
      return 'Phone number is required';
    if (kind === 'wallet_payment' && (!f.wallet || !String(f.wallet).trim()))
      return 'Wallet number is required';
    return null;
  }

  const handleQuickSend = () => {
    const err = validateQuickTest(qtKind, {
      amount: qtAmount,
      phone: qtPhone,
      wallet: qtWallet,
      orderRef: qtOrderRef,
    });
    if (err) {
      alert(err);
      return;
    }
    const payload =
      qtKind === 'stk_push'
        ? {
            amount: Number(qtAmount),
            msisdn: qtPhone,
            phone_number: qtPhone,
            reference: qtOrderRef,
            order_reference: qtOrderRef,
            channel: '100001',
            currency: 'KES',
            description: 'Payment',
          }
        : {
            amount: Number(qtAmount),
            wallet_number: qtWallet,
            wallet_no: qtWallet,
            reference: qtOrderRef,
            order_reference: qtOrderRef,
            channel: '111111',
            currency: 'KES',
            description: 'Payment',
          };
    createPaymentMutation.mutate({ action: qtKind, payload });
  };

  const handleQuickStatus = () => {
    if (!qtPaymentId) {
      setQtResult({ ok: false, error: 'Provide a payment_id to sync' });
      return;
    }
    statusSyncMutation.mutate({ payment_id: Number(qtPaymentId) });
  };

  const busyQuick =
    createPaymentMutation.isPending || statusSyncMutation.isPending;

  const handleRunTrace = () => {
    const payload = parsePayload();
    if (!payload) return;
    runTraceMutation.mutate({ action, payload });
  };

  const handleCheckStatus = () => {
    const payload = parsePayload();
    if (!payload) return;
    checkStatusMutation.mutate({ payload });
  };

  const handleReset = () => {
    setPayloadText(JSON.stringify(DEFAULTS[action as keyof typeof DEFAULTS], null, 2));
    setError(null);
  };

  const handleUseExample = () => handleReset();

  const handleCopyCurl = () => {
    if (lastCurl) {
      navigator.clipboard.writeText(lastCurl).catch(() => {});
    }
  };

  const running = runTraceMutation.isPending || checkStatusMutation.isPending;

  if (userLoading || sessionQuery.isLoading) {
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
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Payments Trace</h1>
          <p className="text-text-secondary">Debug and test payment integrations</p>
        </div>

        <DiagnosticsBar
          probeData={probeQuery.data}
          onConnectivityCheck={handleConnectivity}
          onRelayRediscover={handleRelayRediscover}
          onForceDirect={handleForceDirect}
        />
        <ConnectivityDisplay connectivity={connectivity} />
        <ConfigWarning probeData={probeQuery.data} />

        {isAdmin && (
          <QuickTest
            qtKind={qtKind}
            setQtKind={setQtKind}
            qtAmount={qtAmount}
            setQtAmount={setQtAmount}
            qtPhone={qtPhone}
            setQtPhone={setQtPhone}
            qtWallet={qtWallet}
            setQtWallet={setQtWallet}
            qtOrderRef={qtOrderRef}
            setQtOrderRef={setQtOrderRef}
            qtPaymentId={qtPaymentId}
            setQtPaymentId={setQtPaymentId}
            qtResult={qtResult}
            busyQuick={busyQuick}
            onQuickSend={handleQuickSend}
            onQuickStatus={handleQuickStatus}
            createPending={createPaymentMutation.isPending}
            statusPending={statusSyncMutation.isPending}
          />
        )}

        {isAdmin && (
          <RecentPayments
            recentQuery={recentQuery}
            onViewPayment={(id) => viewPaymentMutation.mutate(id)}
          />
        )}

        {!isAdmin ? (
          <div className="bg-surface rounded-card border border-[#E0E0E0] p-6">
            <p className="text-text">
              You need admin access to use this page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TraceControls
              action={action}
              setAction={setAction}
              mode={mode}
              setMode={setMode}
              payloadText={payloadText}
              setPayloadText={setPayloadText}
              error={error}
              running={running}
              relayConfigured={probeQuery.data?.relayConfigured}
              onRunTrace={handleRunTrace}
              onCheckStatus={handleCheckStatus}
              onReset={handleReset}
              onUseExample={handleUseExample}
              onCopyCurl={handleCopyCurl}
              lastCurl={lastCurl}
            />
            <ResultsPanel
              results={results}
              lastRunAt={lastRunAt}
              resultsRef={resultsRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <ProtectedRoute requiredRole={ROLES.ADMIN}>
      <AdminPaymentsContent />
    </ProtectedRoute>
  );
}

