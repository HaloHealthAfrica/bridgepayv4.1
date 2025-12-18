import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";
import { validateCreateInput } from "@/app/api/utils/validate";
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";

function mapActionToType(action) {
  if (action === "stk_push") return "paybill";
  if (action === "wallet_payment") return "till";
  return "paybill";
}

function pick(...vals) {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v;
  return null;
}

function generateOrderRef() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `ref-${Date.now()}-${rnd}`;
}

function ensureChannel(action, payload) {
  const eff = { ...(payload || {}) };
  if (!eff.channel) {
    const ch = lemonade.actionToChannel(action);
    if (ch) eff.channel = ch;
  }
  return eff;
}

function isCustomer(role) {
  return role === "customer";
}

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

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/create-self",
  });
  const startedAt = Date.now();
  try {
    // Rate limits (same as payments.create)
    const rl = checkRateLimits({
      request,
      route: "payments.create_self",
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
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
        { status: 429, headers },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers },
      );
    }

    // Resolve role; only customers allowed for self-checkout
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    if (!isCustomer(role)) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers },
      );
    }

    // Parse body
    let body = null;
    try {
      body = await request.json();
    } catch {}

    // Basic validation
    const valErrors = validateCreateInput(body || {});
    if (valErrors.length) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "validation_error", details: valErrors },
        { status: 400, headers },
      );
    }

    const action = body.action;
    // Only allow self-checkout methods
    if (!["stk_push", "wallet_payment"].includes(action)) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: [{ field: "action", message: "action not allowed" }],
        },
        { status: 400, headers },
      );
    }

    const rawPayload = body.payload || {};
    const payload = ensureChannel(action, rawPayload);
    const amountNum = Number(payload?.amount);

    let order_reference = payload?.order_reference;
    if (!order_reference) order_reference = generateOrderRef();

    // Idempotency pre-check
    const idemKey = order_reference;
    const found = await findIdempotent(idemKey);
    if (found && found.payment_id) {
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: false,
      });
      return Response.json(
        { ...(found.response || {}), order_reference },
        { status: 200, headers },
      );
    }

    const type = mapActionToType(action);

    // Insert pending payment row
    const metadataExtra =
      body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
    const inserted = await sql(
      "INSERT INTO mpesa_payments (user_id, type, amount, status, order_reference, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id",
      [
        session.user.id,
        type,
        amountNum,
        "pending",
        order_reference,
        JSON.stringify({
          action,
          order_reference,
          sent_payload: payload,
          provider: "lemonade",
          ...metadataExtra,
        }),
      ],
    );
    const paymentId = inserted?.[0]?.id;

    // Provider call via unified client (RELAY ONLY to satisfy IP whitelist)
    const res = await lemonade.call({
      action,
      payload,
      mode: "relay", // was: "auto"
      correlationId: reqMeta.id,
      idempotencyKey: order_reference,
    });

    const provider_ref = pick(
      res?.data?.provider_ref,
      res?.data?.provider_reference,
      res?.data?.transaction_id,
      res?.data?.reference,
      res?.data?.data?.transaction_id,
      res?.data?.data?.reference,
    );

    const mapped = res?.ok ? mapProviderStatus(res?.data) : "pending";

    // Update payment row
    await sql(
      "UPDATE mpesa_payments SET provider_ref = $1, status = $2, metadata = metadata || $3::jsonb, updated_at = NOW() WHERE id = $4",
      [
        provider_ref,
        mapped,
        JSON.stringify({ provider_response: res?.data || null }),
        paymentId,
      ],
    );

    await sql(
      "INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES ($1, $2, $3::jsonb)",
      [paymentId, mapped, JSON.stringify(res?.data || null)],
    );

    const baseResponse = {
      payment_id: paymentId,
      status: mapped,
      provider_ref: provider_ref || null,
      order_reference,
    };

    if (res.ok) {
      const response = {
        ok: true,
        ...baseResponse,
        data: res.data,
        requestHeaders:
          res.mode === "direct"
            ? {
                Authorization: "Bearer <present>",
                "Content-Type": "application/json",
                "Idempotency-Key": "<present>",
              }
            : { Header: "<present>", "Content-Type": "application/json" },
        url: res.url,
        mode: res.mode,
      };
      await saveIdempotent(idemKey, paymentId, response);
      await writeAudit({
        userId: session.user.id,
        action: "payments.create",
        metadata: {
          correlationId: reqMeta.id,
          paymentId,
          mode: res.mode,
          self: true,
        },
      });
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: false,
      });
      return Response.json(response, { status: 200, headers });
    } else {
      const response = {
        ok: false,
        ...baseResponse,
        data: res.data,
        raw: res.raw,
        statusCode: res.status,
        mode: res.mode,
      };
      await saveIdempotent(idemKey, paymentId, response);
      await writeAudit({
        userId: session.user.id,
        action: "payments.create",
        metadata: {
          correlationId: reqMeta.id,
          paymentId,
          error: true,
          mode: res.mode,
          self: true,
        },
      });
      const headers = reqMeta.header();
      recordMetric({
        route: "payments.create_self",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(response, { status: res.status || 400, headers });
    }
  } catch (e) {
    const headers = reqMeta.header();
    await writeAudit({
      userId: null,
      action: "payments.create",
      metadata: { correlationId: reqMeta.id, crashed: true, self: true },
    });
    recordMetric({
      route: "payments.create_self",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers },
    );
  } finally {
    reqMeta.end({ status: 200 });
  }
}
