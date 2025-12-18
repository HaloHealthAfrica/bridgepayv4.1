import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useProbeQuery() {
  return useQuery({
    queryKey: ["lemonade-probe"],
    queryFn: async () => {
      const res = await fetch("/api/payments/lemonade/trace");
      if (!res.ok) throw new Error(`Probe failed: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });
}

export function useSessionQuery() {
  return useQuery({
    queryKey: ["debug-session"],
    queryFn: async () => {
      const res = await fetch("/api/debug/session");
      if (!res.ok) throw new Error(`Session fetch failed: ${res.status}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });
}

export function useIsAdmin(sessionQuery) {
  return useMemo(() => {
    const role = sessionQuery?.data?.user?.role;
    return role === "admin";
  }, [sessionQuery?.data]);
}

export function useRecentPaymentsQuery(isAdmin) {
  return useQuery({
    queryKey: ["recent-payments"],
    queryFn: async () => {
      const res = await fetch("/api/payments/lemonade/recent");
      if (!res.ok) {
        throw new Error(`Recent list failed: ${res.status}`);
      }
      return res.json();
    },
    enabled: isAdmin,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
