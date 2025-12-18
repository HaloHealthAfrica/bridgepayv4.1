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

function parseStart(start_date) {
  if (!start_date) return null;
  const d = new Date(start_date);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request) {
  // Create a scheduled payment
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimits({
    request,
    route: "payments.scheduled.create",
    rules: [{ scope: "user", limit: 30, burst: 30, windowMs: 60_000 }],
  });
  if (!rl.allowed) {
    return Response.json(
      { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429 },
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const amount = Number(body?.amount);
  const currency = body?.currency || "KES";
  const cadence = body?.cadence;
  const payee_user_id = body?.payee_user_id || null;
  const payee = body?.payee || null; // phone or wallet string
  const metadata =
    body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const startIso = parseStart(body?.start_date);

  if (!amount || amount <= 0) {
    return Response.json(
      { ok: false, error: "validation_error", details: ["amount must be > 0"] },
      { status: 400 },
    );
  }
  if (!["daily", "weekly", "monthly"].includes(cadence)) {
    return Response.json(
      { ok: false, error: "validation_error", details: ["invalid cadence"] },
      { status: 400 },
    );
  }

  const now = new Date();
  const firstRunAt =
    startIso && new Date(startIso) > now
      ? startIso
      : addInterval(now.toISOString(), cadence);

  const rows = await sql(
    `INSERT INTO scheduled_payments (user_id, payee_user_id, payee, amount, currency, cadence, start_date, next_run_at, status, retries, max_retries, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',0,3,$9::jsonb)
     RETURNING id`,
    [
      session.user.id,
      payee_user_id,
      payee,
      amount,
      currency,
      cadence,
      startIso,
      firstRunAt,
      JSON.stringify(metadata),
    ],
  );
  const id = rows?.[0]?.id;

  await writeAudit({
    userId: session.user.id,
    action: "scheduled.create",
    metadata: { id },
  });

  return Response.json({ ok: true, id });
}

export async function GET(request) {
  // List schedules for current user
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let query = `SELECT * FROM scheduled_payments WHERE user_id = $1`;
  const vals = [session.user.id];
  if (status) {
    query += ` AND status = $2`;
    vals.push(status);
  }
  query += ` ORDER BY next_run_at ASC LIMIT 200`;

  const rows = await sql(query, vals);
  return Response.json({ ok: true, items: rows });
}
