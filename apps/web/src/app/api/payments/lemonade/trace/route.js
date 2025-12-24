import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";
import { validateTraceInput } from "@/app/api/utils/validate";
// NEW: mapping layer for Lemonade payloads
import { mapToLemonadePayload, validateLemonadePayload } from "../_mapping";

function probeConfigured() {
  // UPDATED: use effective direct base selection to avoid showing a relay URL as the base
  const base = lemonade.pickBaseUrl("direct");
  const directConfigured =
    !!process.env.LEMONADE_CONSUMER_KEY &&
    !!process.env.LEMONADE_CONSUMER_SECRET;
  const relayConfigured = lemonade.hasRelay();
  const hasWebhookSecret = !!process.env.LEMONADE_WEBHOOK_SECRET;
  return {
    directConfigured,
    relayConfigured,
    base,
    hasConsumerKey: !!process.env.LEMONADE_CONSUMER_KEY,
    hasConsumerSecret: !!process.env.LEMONADE_CONSUMER_SECRET,
    hasBaseUrl: !!process.env.LEMONADE_BASE_URL,
    hasWebhookSecret,
  };
}

async function ensureAdmin() {
  const session = await auth();
  if (!session || !session.user?.id)
    return { ok: false, status: 401, json: { error: "unauthorized" } };
  let role = session.user?.role;
  if (!role) {
    try {
      const rows =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = rows?.[0]?.role;
    } catch {}
  }
  if (role !== "admin")
    return { ok: false, status: 403, json: { error: "forbidden" } };
  return { ok: true, session };
}

// NEW: normalize action aliases (keep consistent with create route)
function normalizeAction(a) {
  const x = String(a || "").toLowerCase();
  if (x === "wallet" || x === "wallet_transfer" || x === "walletpay")
    return "wallet_payment";
  if (x === "stk" || x === "paybill" || x === "mpesa_stk") return "stk_push";
  return a;
}

// NEW: derive wallet_no from common aliases (keep consistent with create route)
function deriveWalletNo(obj = {}) {
  const cand = [
    obj.wallet_no,
    obj.wallet_number,
    obj.wallet_id,
    obj.walletId,
    obj.walletNo,
    obj.wallet,
    obj.wallet_number,
    obj.walletNumber,
    obj.walletno,
    obj.till,
    obj.till_no,
    obj.tillNo,
    obj.account,
    obj.account_no,
    obj.accountNo,
    obj.account_number,
  ];
  const found = cand.find(
    (v) => v !== undefined && v !== null && String(v).trim() !== "",
  );
  return found !== undefined && found !== null ? String(found).trim() : null;
}

export async function GET(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/trace[GET]",
  });
  try {
    const baseProbe = probeConfigured();
    const strategy = await lemonade.getRelayStrategy();
    const breaker = lemonade.relayBreakerState();
    recordMetric({ route: "payments.trace.get", durationMs: 1, error: false });
    return Response.json(
      {
        ok: true,
        ...baseProbe,
        relayStrategy: strategy
          ? {
              discovered: true,
              discoveredAt: strategy.discoveredAt,
              statusPath: strategy.statusPath,
            }
          : { discovered: false },
        relayBreaker: breaker,
        preferRelay: lemonade.preferRelay(),
        relayBase: lemonade.hasRelay() ? lemonade.pickRelayBase() : null,
      },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    recordMetric({ route: "payments.trace.get", durationMs: 1, error: true });
    return Response.json(
      { ok: false, error: "probe_failed" },
      { headers: reqMeta.header() },
    );
  }
}

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/trace",
  });
  const startedAt = Date.now();
  try {
    // auth guard
    const guard = await ensureAdmin();
    if (!guard.ok) {
      recordMetric({
        route: "payments.trace",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(guard.json, {
        status: guard.status,
        headers: reqMeta.header(),
      });
    }

    // Rate limits: admin traces are sensitive
    const rl = checkRateLimits({
      request,
      route: "payments.trace",
      rules: [
        { scope: "ip", limit: 30, burst: 30, windowMs: 60_000 },
        { scope: "user", limit: 10, burst: 10, windowMs: 60_000 },
      ],
    });
    if (!rl.allowed) {
      recordMetric({
        route: "payments.trace",
        durationMs: Date.now() - startedAt,
        error: true,
      });
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

    // Parse input
    let body = null;
    try {
      body = await request.json();
    } catch {}

    const valErrors = validateTraceInput(body || {});
    if (valErrors.length) {
      recordMetric({
        route: "payments.trace",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        { ok: false, error: "validation_error", details: valErrors },
        { status: 400, headers: reqMeta.header() },
      );
    }

    const incomingAction = body?.action || "transaction_status";
    const action = normalizeAction(incomingAction);
    const payload =
      body && body.payload && typeof body.payload === "object"
        ? { ...body.payload }
        : {};
    // Default trace mode to 'relay'
    const forceMode = body?.forceMode || body?.mode || "relay";

    // Map to Lemonade spec + add tolerant aliases
    const lemonPayload = mapToLemonadePayload(action, payload);

    // Ensure wallet_no for ALL payment actions (Relay requires it)
    const MERCHANT_WALLET = process.env.LEMONADE_WALLET_ID || "11391837";
    if (action !== "transaction_status" && !lemonPayload.wallet_no) {
      const derived = deriveWalletNo(lemonPayload);
      lemonPayload.wallet_no = derived || MERCHANT_WALLET;
    }

    // Strict server-side validation before provider call
    const missing = validateLemonadePayload(action, lemonPayload);
    if (missing) {
      recordMetric({
        route: "payments.trace",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        {
          ok: false,
          error: "Missing required fields (trace)",
          missing,
          sent: lemonPayload,
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // Secrets check (direct)
    const { directConfigured, base } = probeConfigured();
    if (!directConfigured && forceMode === "direct") {
      recordMetric({
        route: "payments.trace",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(
        {
          ok: false,
          reason: "missing_secrets",
          directConfigured: false,
          base,
        },
        { headers: reqMeta.header() },
      );
    }

    // Unified call (relay default)
    console.log("\uD83D\uDCE1 TRACE PAYLOAD → LEMONADE", {
      action,
      lemonPayload,
    });
    const res = await lemonade.call({
      action,
      payload: lemonPayload,
      mode: forceMode,
      correlationId: reqMeta.id,
    });

    // Audit + metrics
    await writeAudit({
      userId: guard.session.user.id,
      action:
        action === "transaction_status" ? "payments.status" : "payments.trace",
      metadata: { correlationId: reqMeta.id, ok: !!res.ok, mode: res.mode },
    });

    recordMetric({
      route: "payments.trace",
      durationMs: Date.now() - startedAt,
      error: !res.ok,
    });

    // Build sanitized response
    if (res.ok) {
      return Response.json(
        {
          ok: true,
          mode: res.mode,
          method: res.method,
          url: res.url,
          token:
            res.mode === "direct"
              ? { ok: true, status: res.tokenStatus || 200 }
              : undefined,
          requestHeaders:
            res.mode === "direct"
              ? { Authorization: "Bearer <present>" }
              : { ["Header"]: "<present>" },
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          data: res.data,
          raw: res.raw,
        },
        { headers: reqMeta.header() },
      );
    }

    // Failure path: include minimal attempts info if available
    return Response.json(
      {
        ok: false,
        mode: res.mode || forceMode,
        status: res.status || 400,
        reason: res.reason || undefined,
        step: res.step || undefined,
        tokenStatus: res.tokenStatus || undefined,
        attempts: res.attempts || undefined,
        data: res.data || undefined,
        raw: res.raw || undefined,
        sent: lemonPayload,
      },
      { status: res.status || 400, headers: reqMeta.header() },
    );
  } catch (e) {
    recordMetric({
      route: "payments.trace",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
