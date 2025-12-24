import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";

function addInterval(from, cadence) {
  const d = new Date(from);
  if (cadence === "daily") d.setDate(d.getDate() + 1);
  else if (cadence === "weekly") d.setDate(d.getDate() + 7);
  else if (cadence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function shortCode(id) {
  return String(id || "").slice(0, 8);
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const role =
    session.user.role ||
    (
      await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`
    )?.[0]?.role;
  if (role !== "admin" && role !== "merchant") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const rl = checkRateLimits({
    request,
    route: "payments.scheduled.run",
    rules: [{ scope: "user", limit: 10, burst: 10, windowMs: 60_000 }],
  });
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429 },
    );
  }

  const due =
    await sql`SELECT * FROM scheduled_payments WHERE status = 'active' AND next_run_at <= NOW() ORDER BY next_run_at ASC LIMIT 100`;

  let triggered = 0,
    succeeded = 0,
    failed = 0;

  for (const s of due) {
    triggered++;
    const order_reference = `${s.id}-${new Date(s.next_run_at).toISOString()}`;

    const method = s.metadata?.method || "wallet"; // 'stk' | 'wallet'
    const phone = s.metadata?.phone_number || s.metadata?.msisdn || null;
    const wallet =
      s.metadata?.wallet_no ||
      s.metadata?.wallet_number ||
      s.metadata?.account ||
      null;
    const action = method === "stk" ? "stk_push" : "wallet_payment";

    const payload =
      method === "stk"
        ? {
            amount: Number(s.amount),
            phone_number: phone,
            order_reference,
            currency: s.currency || "KES",
            description: `Scheduled ${shortCode(s.id)}`,
            channel: "100001",
          }
        : {
            amount: Number(s.amount),
            wallet_no: wallet,
            order_reference,
            currency: s.currency || "KES",
            description: `Scheduled ${shortCode(s.id)}`,
            channel: "111111",
          };

    let resOk = false;
    let serverErr5xx = false;

    try {
      const res = await fetch(
        `${process.env.APP_URL || ""}/api/payments/lemonade/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // relies on admin session cookie in this context
          body: JSON.stringify({ action, payload }),
        },
      );
      const json = await res.json().catch(() => null);
      if (res.ok) {
        resOk = true;
        if (json?.status === "completed") succeeded++;
        // Insert an audit event referencing the payment id
        await sql`INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES (${json?.payment_id || null}, ${json?.status || "pending"}, ${JSON.stringify({ scheduled_id: s.id, response: json })}::jsonb)`;
      } else {
        if (res.status >= 500) serverErr5xx = true;
        failed++;
        await sql`INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES (${json?.payment_id || null}, ${"failed"}, ${JSON.stringify({ scheduled_id: s.id, error: json })}::jsonb)`;
      }
    } catch (e) {
      serverErr5xx = true;
      failed++;
      await sql`INSERT INTO mpesa_transactions (payment_id, status, raw) VALUES (${null}, ${"failed"}, ${JSON.stringify({ scheduled_id: s.id, crashed: true })}::jsonb)`;
    }

    // Advance next_run_at or backoff
    if (serverErr5xx) {
      const nxt = new Date();
      const backoffMinutes = Math.min(30, (s.retries + 1) * 5);
      nxt.setMinutes(nxt.getMinutes() + backoffMinutes);
      const newRetries = s.retries + 1;
      if (newRetries > (s.max_retries || 3)) {
        await sql`UPDATE scheduled_payments SET status = 'failed', retries = ${newRetries}, updated_at = NOW() WHERE id = ${s.id}`;
      } else {
        await sql`UPDATE scheduled_payments SET retries = ${newRetries}, next_run_at = ${nxt.toISOString()}, updated_at = NOW() WHERE id = ${s.id}`;
      }
    } else {
      const next = addInterval(
        new Date(s.next_run_at).toISOString(),
        s.cadence,
      );
      await sql`UPDATE scheduled_payments SET next_run_at = ${next}, retries = 0, updated_at = NOW() WHERE id = ${s.id}`;
    }
  }

  await writeAudit({
    userId: session.user.id,
    action: "scheduled.run",
    metadata: { scanned: due.length, triggered, succeeded, failed },
  });

  return Response.json({
    ok: true,
    due: due.length,
    triggered,
    succeeded,
    failed,
  });
}
