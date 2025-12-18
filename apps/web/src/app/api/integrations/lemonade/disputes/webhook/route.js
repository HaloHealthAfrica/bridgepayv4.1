import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { writeAudit } from "@/app/api/utils/audit";

function mapStatus(s) {
  const x = String(s || "").toLowerCase();
  if (["pending", "opened", "open"].includes(x)) return "opened";
  if (["need_evidence", "evidence_required", "evidence"].includes(x))
    return "evidence_required";
  if (["under_review", "review"].includes(x)) return "under_review";
  if (["won", "accepted"].includes(x)) return "won";
  if (["lost", "rejected"].includes(x)) return "lost";
  if (["resolved", "closed"].includes(x)) return "resolved";
  if (["cancelled", "canceled"].includes(x)) return "cancelled";
  return "opened";
}

function safeNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/integrations/lemonade/disputes/webhook",
  });
  try {
    let body = null;
    try {
      body = await request.json();
    } catch {}

    // Simple signature check placeholder (accept if secret not set)
    const secret = process.env.LEMONADE_WEBHOOK_SECRET;
    const signature =
      request.headers.get("x-lemonade-signature") ||
      request.headers.get("x-signature");
    const verified = !!secret && !!signature; // Not fully verifying due to unknown scheme

    const extId = body?.id || body?.external_id || body?.data?.id;
    const amount = safeNum(body?.amount || body?.data?.amount);
    const currency = body?.currency || body?.data?.currency || "KES";
    const reason = body?.reason || body?.data?.reason || null;
    const status = mapStatus(body?.status || body?.data?.status);
    const provider_ref =
      body?.provider_ref ||
      body?.transaction_id ||
      body?.data?.transaction_id ||
      null;
    const order_reference =
      body?.order_reference || body?.reference || body?.data?.reference || null;
    const due_at = body?.due_at ? new Date(body.due_at) : null;

    if (!extId || !amount) {
      return Response.json(
        { ok: false, error: "malformed" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // Try to link to payment
    let paymentId = null;
    if (provider_ref) {
      const p =
        await sql`SELECT id FROM mpesa_payments WHERE provider_ref = ${provider_ref} LIMIT 1`;
      paymentId = p?.[0]?.id || null;
    }
    if (!paymentId && order_reference) {
      const p2 =
        await sql`SELECT id FROM mpesa_payments WHERE order_reference = ${order_reference} LIMIT 1`;
      paymentId = p2?.[0]?.id || null;
    }

    // Upsert dispute by external_id
    const existing =
      await sql`SELECT id FROM disputes WHERE external_id = ${extId} LIMIT 1`;
    if (existing?.length) {
      await sql(
        "UPDATE disputes SET payment_id = COALESCE($1, payment_id), amount = $2, currency = $3, reason = $4, status = $5, due_at = $6, metadata = COALESCE(metadata,'{}'::jsonb) || $7::jsonb, updated_at = NOW() WHERE external_id = $8",
        [
          paymentId,
          amount,
          currency,
          reason,
          status,
          due_at,
          JSON.stringify({ raw: body, verified }),
          extId,
        ],
      );
      await writeAudit({
        userId: null,
        action: "disputes.webhook_update",
        metadata: { correlationId: reqMeta.id, external_id: extId, status },
      });
    } else {
      await sql(
        "INSERT INTO disputes (payment_id, external_id, amount, currency, reason, status, due_at, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
        [
          paymentId,
          extId,
          amount,
          currency,
          reason,
          status,
          due_at,
          JSON.stringify({ raw: body, verified }),
        ],
      );
      await writeAudit({
        userId: null,
        action: "disputes.webhook_received",
        metadata: { correlationId: reqMeta.id, external_id: extId, status },
      });
    }

    // Insert an audit transaction event if linked
    if (paymentId) {
      await sql(
        "INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES ($1, $2, $3::jsonb)",
        [
          paymentId,
          "dispute",
          JSON.stringify({ ...body, verified: undefined }),
        ],
      );
    }

    return Response.json(
      { ok: true },
      { status: 200, headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  } finally {
    reqMeta.end({ status: 200 });
  }
}
