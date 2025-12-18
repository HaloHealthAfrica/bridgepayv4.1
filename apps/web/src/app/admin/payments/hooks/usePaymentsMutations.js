import { useMutation } from "@tanstack/react-query";

export function useRunTraceMutation({
  setResults,
  setLastRunAt,
  setLastCurl,
  scrollResultsIntoView,
  mode,
}) {
  return useMutation({
    mutationFn: async ({ action, payload }) => {
      const res = await fetch("/api/payments/lemonade/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload, mode }),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Trace failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    retry: false,
    onSuccess: (data, vars) => {
      setResults({ source: "trace", data });
      setLastRunAt(new Date().toISOString());
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const body = JSON.stringify(
        { action: vars.action, payload: vars.payload, mode },
        null,
        0,
      );
      const curl = `curl -X POST '${origin}/api/payments/lemonade/trace' -H 'Content-Type: application/json' --data '${body.replace(/'/g, "'\\''")}'`;
      setLastCurl(curl);
      scrollResultsIntoView();
    },
    onError: (err) => {
      console.error("runTrace error", err);
      setResults({
        source: "trace",
        data: { ok: false, error: err.message, details: err.response || null },
      });
      setLastRunAt(new Date().toISOString());
      scrollResultsIntoView();
    },
  });
}

export function useCheckStatusMutation({
  setResults,
  setLastRunAt,
  setLastCurl,
  scrollResultsIntoView,
}) {
  return useMutation({
    mutationFn: async ({ payload }) => {
      const res = await fetch("/api/payments/lemonade/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Status failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    retry: false,
    onSuccess: (data, vars) => {
      setResults({ source: "status", data });
      setLastRunAt(new Date().toISOString());
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const body = JSON.stringify(vars.payload, null, 0);
      const curl = `curl -X POST '${origin}/api/payments/lemonade/status' -H 'Content-Type: application/json' --data '${body.replace(/'/g, "'\\''")}'`;
      setLastCurl(curl);
      scrollResultsIntoView();
    },
    onError: (err) => {
      console.error("checkStatus error", err);
      setResults({
        source: "status",
        data: { ok: false, error: err.message, details: err.response || null },
      });
      setLastRunAt(new Date().toISOString());
      scrollResultsIntoView();
    },
  });
}

export function useCreatePaymentMutation({
  setQtResult,
  setQtPaymentId,
  queryClient,
}) {
  return useMutation({
    mutationFn: async ({ action, payload }) => {
      const res = await fetch("/api/payments/lemonade/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Create failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    retry: false,
    onSuccess: (data) => {
      setQtResult(data);
      if (data?.payment_id) {
        setQtPaymentId(String(data.payment_id));
      }
      queryClient.invalidateQueries({ queryKey: ["recent-payments"] });
    },
    onError: (err) => {
      console.error("createPayment error", err);
      setQtResult({
        ok: false,
        error: err.message,
        details: err.response || null,
      });
    },
  });
}

export function useStatusSyncMutation({ setQtResult }) {
  return useMutation({
    mutationFn: async ({ payment_id }) => {
      const res = await fetch("/api/payments/lemonade/status-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id }),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Status sync failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    retry: false,
    onSuccess: (data) => {
      setQtResult(data);
    },
    onError: (err) => {
      console.error("statusSync error", err);
      setQtResult({
        ok: false,
        error: err.message,
        details: err.response || null,
      });
    },
  });
}

export function useViewPaymentMutation({
  setResults,
  setLastRunAt,
  scrollResultsIntoView,
}) {
  return useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/payments/lemonade/${id}`);
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {}
      if (!res.ok) {
        const err = new Error(`Fetch payment failed: ${res.status}`);
        err.response = json || text;
        throw err;
      }
      return json;
    },
    retry: false,
    onSuccess: (data) => {
      setResults({ source: "payment", data });
      setLastRunAt(new Date().toISOString());
      scrollResultsIntoView();
    },
    onError: (err) => {
      console.error("viewPayment error", err);
      setResults({
        source: "payment",
        data: { ok: false, error: err.message, details: err.response || null },
      });
      setLastRunAt(new Date().toISOString());
      scrollResultsIntoView();
    },
  });
}
