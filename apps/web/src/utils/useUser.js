import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/apiFetch";

export default function useUser() {
  const q = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const data = await apiFetch("/api/debug/session");
      return data?.user || null;
    },
  });

  return {
    data: q.data,
    loading: q.isLoading,
    error: q.error || null,
    refetch: q.refetch,
  };
}


