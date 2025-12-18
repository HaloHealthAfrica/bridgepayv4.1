import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";

function computeEqualShares(total, n) {
  const cents = Math.round(Number(total) * 100);
  const base = Math.floor(cents / n);
  const residual = cents - base * n;
  const shares = Array(n).fill(base);
  shares[n - 1] += residual; // put residual on last
  return shares.map((c) => Number((c / 100).toFixed(2)));
}

export async function POST(request) {
  // Create split group
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimits({
    request,
    route: "payments.split.create",
    rules: [{ scope: "user", limit: 30, burst: 30, windowMs: 60_000 }],
  });
  if (!rl.allowed)
    return Response.json(
      { ok: false, error: "rate_limited", retryAfter: rl.retryAfter },
      { status: 429 },
    );

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const split_type = body?.split_type;
  const total_amount = Number(body?.total_amount);
  const currency = body?.currency || "KES";
  const members = Array.isArray(body?.members) ? body.members : [];

  if (!["equal", "custom"].includes(split_type)) {
    return Response.json(
      { ok: false, error: "validation_error", details: ["invalid split_type"] },
      { status: 400 },
    );
  }
  if (!total_amount || total_amount <= 0) {
    return Response.json(
      {
        ok: false,
        error: "validation_error",
        details: ["total_amount must be > 0"],
      },
      { status: 400 },
    );
  }
  if (!members.length) {
    return Response.json(
      { ok: false, error: "validation_error", details: ["members required"] },
      { status: 400 },
    );
  }

  let amounts = [];
  if (split_type === "equal") {
    amounts = computeEqualShares(total_amount, members.length);
  } else {
    amounts = members.map((m) => Number(m.amount || 0));
    const sum = amounts.reduce((a, b) => a + b, 0);
    if (Number(sum.toFixed(2)) !== Number(Number(total_amount).toFixed(2))) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: ["members sum must equal total_amount"],
        },
        { status: 400 },
      );
    }
  }

  const g = await sql(
    `INSERT INTO split_groups (user_id, total_amount, currency, split_type, status, metadata)
     VALUES ($1,$2,$3,$4,'pending',$5::jsonb) RETURNING id`,
    [
      session.user.id,
      total_amount,
      currency,
      split_type,
      JSON.stringify(body?.metadata || {}),
    ],
  );
  const group_id = g?.[0]?.id;

  const vals = [];
  const chunks = [];
  members.forEach((m, i) => {
    chunks.push(
      `($${vals.length + 1}, $${vals.length + 2}, $${vals.length + 3}, 'pending', $${vals.length + 4}::jsonb)`,
    );
    vals.push(
      group_id,
      m.recipient_user_id || null,
      Number(amounts[i]),
      JSON.stringify({
        payee: m.payee || null,
        ...(m.metadata && typeof m.metadata === "object" ? m.metadata : {}),
      }),
    );
  });
  await sql(
    `INSERT INTO split_group_members (group_id, recipient_user_id, amount, status, metadata) VALUES ${chunks.join(",")}`,
    vals,
  );

  await writeAudit({
    userId: session.user.id,
    action: "split.create",
    metadata: { group_id },
  });

  return Response.json({ ok: true, group_id });
}
