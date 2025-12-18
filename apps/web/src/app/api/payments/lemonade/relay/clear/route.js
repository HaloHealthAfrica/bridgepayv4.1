import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { writeAudit } from "@/app/api/utils/audit";

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

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/relay/clear",
  });
  const guard = await ensureAdmin();
  if (!guard.ok) {
    return Response.json(
      { ok: false, error: guard.status === 401 ? "unauthorized" : "forbidden" },
      { status: guard.status, headers: reqMeta.header() },
    );
  }
  lemonade.clearRelayStrategy();
  await writeAudit({
    userId: guard.session.user.id,
    action: "payments.relay_call",
    metadata: { correlationId: reqMeta.id, op: "relay.clear" },
  });
  return Response.json(
    { ok: true, cleared: true },
    { headers: reqMeta.header() },
  );
}
