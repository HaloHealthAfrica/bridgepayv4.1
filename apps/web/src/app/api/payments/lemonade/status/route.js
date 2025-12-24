import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";

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

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/lemonade/status",
  });
  const startedAt = Date.now();
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      recordMetric({
        route: "payments.status",
        durationMs: Date.now() - startedAt,
        error: true,
      });
      return Response.json(guard.json, {
        status: guard.status,
        headers: reqMeta.header(),
      });
    }

    // Rate limits
    const rl = checkRateLimits({
      request,
      route: "payments.status",
      rules: [
        { scope: "ip", limit: 30, burst: 30, windowMs: 60_000 },
        { scope: "user", limit: 10, burst: 10, windowMs: 60_000 },
      ],
    });
    if (!rl.allowed) {
      recordMetric({
        route: "payments.status",
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

    let body = {};
    try {
      body = await request.json();
    } catch {}

    const payload =
      body && typeof body === "object" ? body.payload || body : {};
    const forceMode = body?.forceMode || body?.mode || "auto";

    const res = await lemonade.call({
      action: "transaction_status",
      payload,
      mode: forceMode,
      correlationId: reqMeta.id,
    });

    await writeAudit({
      userId: guard.session.user.id,
      action: "payments.status",
      metadata: { correlationId: reqMeta.id, ok: !!res.ok, mode: res.mode },
    });

    recordMetric({
      route: "payments.status",
      durationMs: Date.now() - startedAt,
      error: !res.ok,
    });

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
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
          data: res.data,
          raw: res.raw,
        },
        { headers: reqMeta.header() },
      );
    }

    return Response.json(
      {
        ok: false,
        mode: res.mode || forceMode,
        status: res.status || 400,
        reason: res.reason || undefined,
        step: res.step || undefined,
        tokenStatus: res.tokenStatus || undefined,
        data: res.data || undefined,
        raw: res.raw || undefined,
      },
      { status: res.status || 400, headers: reqMeta.header() },
    );
  } catch (e) {
    recordMetric({
      route: "payments.status",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
