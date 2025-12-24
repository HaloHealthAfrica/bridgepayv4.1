import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

function isAdmin(role) {
  return role === "admin";
}

export async function GET() {
  const rows = await sql(
    "SELECT id, code, name, fee_type, applies_to, payer, amount, rate, tiers, status, effective_start, effective_end, metadata, created_at, updated_at FROM billing_fee_catalog ORDER BY created_at DESC",
  );
  return ok({ fees: rows || [] });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return bad(401, "unauthorized");
  let role = session?.user?.role;
  if (!role) {
    try {
      const r = await sql("SELECT role FROM auth_users WHERE id = $1", [
        session.user.id,
      ]);
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isAdmin(role)) return bad(403, "forbidden");

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const {
    code,
    name,
    fee_type,
    applies_to,
    payer,
    amount = null,
    rate = null,
    tiers = null,
    status = "active",
    effective_start = null,
    effective_end = null,
    metadata = {},
  } = body || {};

  if (!code || !name || !fee_type || !applies_to || !payer) {
    return bad(400, "missing_fields");
  }

  try {
    const up = await sql(
      `INSERT INTO billing_fee_catalog (code, name, fee_type, applies_to, payer, amount, rate, tiers, status, effective_start, effective_end, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         fee_type = EXCLUDED.fee_type,
         applies_to = EXCLUDED.applies_to,
         payer = EXCLUDED.payer,
         amount = EXCLUDED.amount,
         rate = EXCLUDED.rate,
         tiers = EXCLUDED.tiers,
         status = EXCLUDED.status,
         effective_start = EXCLUDED.effective_start,
         effective_end = EXCLUDED.effective_end,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        String(code),
        String(name),
        String(fee_type),
        String(applies_to),
        String(payer),
        amount == null ? null : Number(amount),
        rate == null ? null : Number(rate),
        tiers ? JSON.stringify(tiers) : JSON.stringify([]),
        String(status),
        effective_start,
        effective_end,
        JSON.stringify(metadata || {}),
      ],
    );
    return ok({ fee: up?.[0] });
  } catch (e) {
    console.error("/api/billing/fees POST error", e);
    return bad(500, "server_error");
  }
}
