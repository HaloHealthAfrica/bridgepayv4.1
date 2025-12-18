import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { recordMetric } from "@/app/api/utils/metrics";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function GET(request, { params: { id } }) {
  const reqMeta = startRequest({
    request,
    route: "/api/merchant/refunds/[id]",
  });
  const startedAt = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    if (!isPrivileged(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    const rows =
      await sql`SELECT id, payment_id, amount, currency, reason, status, provider_ref, refund_reference, metadata, created_at, updated_at FROM refunds WHERE id = ${id} LIMIT 1`;
    const refund = rows?.[0];
    if (!refund) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    const tx =
      await sql`SELECT id, status, provider_code, raw, created_at FROM mpesa_transactions WHERE payment_id = ${refund.payment_id} AND status = 'refund' ORDER BY created_at DESC`;

    recordMetric({
      route: "refunds.get",
      durationMs: Date.now() - startedAt,
      error: false,
    });
    return Response.json(
      { ok: true, refund, transactions: tx },
      { status: 200, headers: reqMeta.header() },
    );
  } catch (e) {
    recordMetric({
      route: "refunds.get",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
