import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { startRequest } from "@/app/api/utils/logger";

function isAdmin(role) {
  return role === "admin";
}

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/admin/metrics/overview",
  });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session?.user?.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    if (!isAdmin(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    const hasWebhookSecret = !!process.env.LEMONADE_WEBHOOK_SECRET;

    // last webhook event
    const lastRows = await sql`
      SELECT created_at, status FROM mpesa_transactions
      WHERE (raw ->> 'source') = 'webhook'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastWebhookAt = lastRows?.[0]?.created_at || null;
    const lastWebhookStatus = lastRows?.[0]?.status || null;

    // counts last 24h
    const verifiedRows = await sql`
      SELECT COUNT(*)::int AS c FROM mpesa_transactions
      WHERE (raw ->> 'source') = 'webhook' AND (raw ->> 'verified') = 'true' AND created_at > NOW() - INTERVAL '24 hours'
    `;
    const webhookVerifiedCount = verifiedRows?.[0]?.c || 0;

    const failedSigRows = await sql`
      SELECT COUNT(*)::int AS c FROM audit_logs
      WHERE action = 'payments.webhook_received' AND (metadata ->> 'invalidSignature') = 'true' AND created_at > NOW() - INTERVAL '24 hours'
    `;
    const webhookFailedSignatures = failedSigRows?.[0]?.c || 0;

    return Response.json(
      {
        ok: true,
        hasWebhookSecret,
        lastWebhookAt,
        lastWebhookStatus,
        webhookVerifiedCount,
        webhookFailedSignatures,
      },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
