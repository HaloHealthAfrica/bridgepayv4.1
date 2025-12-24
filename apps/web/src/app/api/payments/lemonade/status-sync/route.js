import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";
import { validateStatusSyncInput } from "@/app/api/utils/validate";

function mapProviderStatus(data) {
  const s = String(
    (
      data?.status ||
      data?.transaction_status ||
      data?.payment_status ||
      data?.data?.status ||
      ""
    ).toString(),
  ).toLowerCase();
  if (["success", "succeeded", "completed", "complete"].includes(s))
    return "completed";
  if (["failed", "declined", "rejected", "error"].includes(s)) return "failed";
  return "pending";
}

function isAdmin(role) {
  return role === "admin";
}

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/status-sync",
  });
  const startedAt = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers },
      );
    }

    // Rate limit per-user + per-ip
    const rl = checkRateLimits({
      request,
      route: "payments.status_sync",
      rules: [
        { scope: "ip", limit: 30, burst: 30, windowMs: 60_000 },
        { scope: "user", limit: 10, burst: 10, windowMs: 60_000 },
        { scope: "user", limit: 60, burst: 60, windowMs: 60 * 60_000 },
      ],
    });
    if (!rl.allowed) {
      const headers = {
        ...reqMeta.header(),
        "Retry-After": String(rl.retryAfter),
      };
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
        { status: 429, headers },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}

    const errors = validateStatusSyncInput(body || {});
    if (errors.length) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "validation_error", details: errors },
        { status: 400, headers },
      );
    }

    const payment_id = Number(body?.payment_id);

    const rows =
      await sql`SELECT * FROM mpesa_payments WHERE id = ${payment_id} LIMIT 1`;
    const payment = rows?.[0];
    if (!payment) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers },
      );
    }

    // Resolve role and enforce access: admin OR creator
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    const isCreator = String(payment.user_id) === String(session.user.id);
    if (!isAdmin(role) && !isCreator) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers },
      );
    }

    // Build status payload from what we have
    const meta = payment?.metadata || {};
    const transaction_id =
      meta?.provider_response?.transaction_id ||
      meta?.provider_response?.data?.transaction_id ||
      payment?.provider_ref ||
      meta?.provider_ref ||
      null;
    const statusPayload = {};
    if (transaction_id) statusPayload.transaction_id = transaction_id;
    if (!transaction_id && payment.order_reference)
      statusPayload.order_reference = payment.order_reference;

    // FORCE RELAY for status checks to keep traffic on whitelisted IP
    const res = await lemonade.call({
      action: "transaction_status",
      payload: statusPayload,
      mode: "relay",
      correlationId: reqMeta.id,
    });

    const attempts = res?.attempts || [];

    if (!res.ok) {
      await writeAudit({
        userId: session.user.id,
        action: "payments.status_sync",
        metadata: {
          correlationId: reqMeta.id,
          paymentId: payment_id,
          ok: false,
          mode: res.mode,
        },
      });
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.status_sync",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, payment_id, attempts, mode: res.mode, status: res.status },
        { status: 200, headers },
      );
    }

    const newStatus = mapProviderStatus(res.data);

    // update payment row with latest provider status
    await sql(
      "UPDATE mpesa_payments SET status = $1, metadata = metadata || $2::jsonb, updated_at = NOW() WHERE id = $3",
      [
        newStatus,
        JSON.stringify({ last_status: res.data || null }),
        payment_id,
      ],
    );

    await sql(
      "INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES ($1, $2, $3::jsonb)",
      [payment_id, newStatus, JSON.stringify(res.data || null)],
    );

    // NEW: if this payment is linked to an invoice, close the loop
    try {
      const invoiceId = meta?.invoice_id;
      if (invoiceId && newStatus === "completed") {
        await sql(
          "UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1 AND status <> 'paid'",
          [Number(invoiceId)],
        );
      }
    } catch {}

    // NEW: if this payment originated from a QR code (order_reference === code), mark it as used when completed
    try {
      const code = payment?.order_reference;
      if (code && newStatus === "completed") {
        await sql(
          "UPDATE qr_codes SET status = 'used', metadata = COALESCE(metadata,'{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE code = $2 AND status <> 'used'",
          [
            JSON.stringify({ used_at: new Date().toISOString(), payment_id }),
            String(code),
          ],
        );
      }
    } catch {}

    await writeAudit({
      userId: session.user.id,
      action: "payments.status_sync",
      metadata: {
        correlationId: reqMeta.id,
        paymentId: payment_id,
        ok: true,
        mode: res.mode,
      },
    });
    const headers = reqMeta.header();
    recordMetric({
      route: "payments.status_sync",
      durationMs: Date.now() - startedAt,
      error: false,
    });
    return Response.json(
      {
        ok: true,
        payment_id,
        new_status: newStatus,
        data: res.data,
        attempts,
        mode: res.mode,
      },
      { headers },
    );
  } catch (e) {
    const headers = reqMeta.header();
    await writeAudit({
      userId: null,
      action: "payments.status_sync",
      metadata: { correlationId: reqMeta.id, crashed: true },
    });
    recordMetric({
      route: "payments.status_sync",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers },
    );
  }
}
