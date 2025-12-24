import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";

async function ensureAdmin() {
  const session = await auth();
  if (!session || !session.user?.id) return { ok: false, status: 401 };
  let role = session.user?.role;
  if (!role) {
    try {
      const rows =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = rows?.[0]?.role;
    } catch {}
  }
  if (role !== "admin") return { ok: false, status: 403 };
  return { ok: true, session };
}

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/relay/diagnostics",
  });
  const guard = await ensureAdmin();
  if (!guard.ok) {
    return Response.json(
      { ok: false, error: guard.status === 401 ? "unauthorized" : "forbidden" },
      { status: guard.status, headers: reqMeta.header() },
    );
  }
  const relayConfigured = lemonade.hasRelay();
  const base = relayConfigured ? lemonade.pickRelayBase() : null;
  const strategy = await lemonade.getRelayStrategy();
  const breaker = lemonade.relayBreakerState();
  const lastErrorAt = lemonade.relayLastErrorAt();
  return Response.json(
    {
      ok: true,
      relayConfigured,
      base,
      strategy: strategy
        ? {
            discovered: true,
            discoveredAt: strategy.discoveredAt,
            statusPath: strategy.statusPath,
          }
        : { discovered: false },
      breaker,
      lastErrorAt,
    },
    { headers: reqMeta.header() },
  );
}
