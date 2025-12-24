import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

function safeNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function shortRef(id) {
  return String(id || "")
    .toString()
    .slice(-6);
}

export async function GET(request) {
  const reqMeta = startRequest({ request, route: "/api/merchant/refunds" });
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 50)),
    );
    const cursor = searchParams.get("cursor"); // created_at ISO string

    let where = [];
    let params = [];
    let p = 1;
    if (status) {
      where.push(`status = $${p++}`);
      params.push(status);
    }
    if (cursor) {
      where.push(`created_at < $${p++}`);
      params.push(new Date(cursor));
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await sql(
      `SELECT id, payment_id, amount, currency, reason, status, provider_ref, refund_reference, created_at, updated_at
       FROM refunds ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
      params,
    );

    recordMetric({
      route: "refunds.list",
      durationMs: Date.now() - startedAt,
      error: false,
    });
    return Response.json(
      { ok: true, refunds: rows },
      { status: 200, headers: reqMeta.header() },
    );
  } catch (e) {
    recordMetric({
      route: "refunds.list",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  } finally {
    reqMeta.end({ status: 200 });
  }
}

export async function POST(request) {
  const reqMeta = startRequest({ request, route: "/api/merchant/refunds" });
  const startedAt = Date.now();
  try {
    // Rate limit
    const rl = checkRateLimits({
      request,
      route: "refunds.create",
      rules: [{ scope: "user", limit: 10, burst: 10, windowMs: 60_000 }],
    });
    if (!rl.allowed) {
      return Response.json(
        { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
        {
          status: 429,
          headers: {
            ...reqMeta.header(),
            "Retry-After": String(rl.retryAfter),
          },
        },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      recordMetric({
        route: "refunds.create",
        durationMs: Date.now() - startedAt,
        error: true,
      });
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
      recordMetric({
        route: "refunds.create",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {}
    const payment_id = body?.payment_id;
    const amountProvided = body?.amount;
    const currency = body?.currency || "KES";
    const reason = body?.reason || null;
    let refund_reference = body?.refund_reference || null;

    if (!payment_id) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["payment_id is required"],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    const payRows =
      await sql`SELECT id, amount, status, order_reference, provider_ref FROM mpesa_payments WHERE id = ${payment_id} LIMIT 1`;
    const payment = payRows?.[0];
    if (!payment) {
      return Response.json(
        { ok: false, error: "not_found", details: ["payment not found"] },
        { status: 404, headers: reqMeta.header() },
      );
    }
    const payStatus = String(payment.status || "").toLowerCase();
    if (!(payStatus === "completed" || payStatus === "pending")) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["refund not allowed for this payment status"],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    const succeededRefunds =
      await sql`SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE payment_id = ${payment_id} AND status = 'succeeded'`;
    const refundedSoFar = Number(succeededRefunds?.[0]?.total || 0);
    const originalAmount = Number(payment.amount || 0);
    const remaining = Math.max(0, originalAmount - refundedSoFar);

    let amount =
      amountProvided != null ? safeNumber(amountProvided) : remaining;
    if (!amount || amount <= 0) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["amount must be > 0"],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }
    if (amount > remaining) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["amount exceeds refundable remaining"],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    if (!refund_reference) {
      refund_reference = `refund_${payment_id}_${amount}_${Date.now()}`;
    }

    // Idempotency: if exists by refund_reference, return it
    const existing =
      await sql`SELECT id, payment_id, amount, currency, reason, status, provider_ref, refund_reference, created_at, updated_at FROM refunds WHERE refund_reference = ${refund_reference} LIMIT 1`;
    if (existing?.length) {
      recordMetric({
        route: "refunds.create",
        durationMs: Date.now() - startedAt,
        error: false,
      });
      return Response.json(
        { ok: true, refund: existing[0] },
        { status: 200, headers: reqMeta.header() },
      );
    }

    // Insert refund row as processing
    const inserted = await sql(
      "INSERT INTO refunds (payment_id, initiated_by_user_id, amount, currency, reason, status, refund_reference, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id, created_at",
      [
        payment_id,
        session.user.id,
        amount,
        currency,
        reason,
        "processing",
        refund_reference,
        JSON.stringify({ correlationId: reqMeta.id }),
      ],
    );
    const refundId = inserted?.[0]?.id;

    await writeAudit({
      userId: session.user.id,
      action: "payments.refund_create",
      metadata: { correlationId: reqMeta.id, refundId, paymentId: payment_id },
    });

    // Build provider payload
    const order_reference = payment.order_reference || `pay_${payment_id}`;
    const providerPayload = {
      amount,
      currency,
      order_reference,
      provider_ref: payment.provider_ref || undefined,
      description: `Refund: ${order_reference}`,
    };

    // Call provider (auto => relay preferred). Use refund_reference as Idempotency-Key
    const provider = await lemonade.call({
      action: "refund",
      payload: providerPayload,
      mode: "auto",
      correlationId: reqMeta.id,
      idempotencyKey: refund_reference,
    });

    let updated;
    if (provider?.ok) {
      const provider_ref =
        provider?.data?.provider_ref ||
        provider?.data?.reference ||
        provider?.data?.transaction_id ||
        null;
      updated = await sql(
        "UPDATE refunds SET status = 'succeeded', provider_ref = $1, metadata = COALESCE(metadata,'{}'::jsonb) || $2::jsonb, updated_at = NOW() WHERE id = $3 RETURNING id, payment_id, amount, currency, reason, status, provider_ref, refund_reference, created_at, updated_at",
        [
          provider_ref,
          JSON.stringify({ provider_response: provider?.data || null }),
          refundId,
        ],
      );
      // Log a transaction event for audit
      await sql(
        "INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES ($1, $2, $3::jsonb)",
        [payment_id, "refund", JSON.stringify(provider?.data || null)],
      );
      recordMetric({
        route: "refunds.create",
        durationMs: Date.now() - startedAt,
        error: false,
      });
      await writeAudit({
        userId: session.user.id,
        action: "payments.refund_update",
        metadata: { correlationId: reqMeta.id, refundId, status: "succeeded" },
      });
      return Response.json(
        { ok: true, refund: updated?.[0] },
        { status: 200, headers: reqMeta.header() },
      );
    } else {
      // failed
      await sql(
        "UPDATE refunds SET status = 'failed', metadata = COALESCE(metadata,'{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2",
        [
          JSON.stringify({
            error: provider?.data || provider?.raw || null,
            status: provider?.status || 0,
          }),
          refundId,
        ],
      );
      recordMetric({
        route: "refunds.create",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      await writeAudit({
        userId: session.user.id,
        action: "payments.refund_update",
        metadata: { correlationId: reqMeta.id, refundId, status: "failed" },
      });
      return Response.json(
        {
          ok: false,
          error: "refund_failed",
          refund: {
            id: refundId,
            payment_id,
            amount,
            currency,
            status: "failed",
            refund_reference,
          },
        },
        { status: provider?.status || 400, headers: reqMeta.header() },
      );
    }
  } catch (e) {
    recordMetric({
      route: "refunds.create",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  } finally {
    reqMeta.end({ status: 200 });
  }
}
