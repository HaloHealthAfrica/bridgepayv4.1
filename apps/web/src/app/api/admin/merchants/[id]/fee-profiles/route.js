import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}
function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

async function requireAdmin(session) {
  if (!session?.user?.id) return false;
  let role = session.user.role;
  if (!role) {
    try {
      const r = await sql("SELECT role FROM auth_users WHERE id = $1 LIMIT 1", [
        session.user.id,
      ]);
      role = r?.[0]?.role;
    } catch {}
  }
  return role === "admin";
}

export async function GET(_request, { params }) {
  const session = await auth();
  if (!(await requireAdmin(session))) return bad(403, "forbidden");
  const merchantId = params?.id;
  if (!merchantId) return bad(400, "missing_merchant_id");

  const merchant =
    await sql`SELECT id, name, email, COALESCE(role,'customer') AS role FROM auth_users WHERE id = ${merchantId} LIMIT 1`;
  if (!merchant?.[0]) return bad(404, "not_found");

  const fees = await sql(
    "SELECT code, name, fee_type, applies_to, payer, amount, rate, tiers, status, metadata FROM billing_fee_catalog ORDER BY created_at DESC",
  );
  const profiles = await sql(
    "SELECT id, merchant_id, fee_code, overrides, status, created_at, updated_at FROM merchant_fee_profiles WHERE merchant_id = $1 ORDER BY created_at DESC",
    [String(merchantId)],
  );

  return ok({ merchant: merchant[0], fees: fees || [], profiles: profiles || [] });
}

export async function POST(request, { params }) {
  const session = await auth();
  if (!(await requireAdmin(session))) return bad(403, "forbidden");
  const merchantId = params?.id;
  if (!merchantId) return bad(400, "missing_merchant_id");

  const body = await request.json().catch(() => ({}));
  const fee_code = (body?.fee_code || "").toString().trim();
  const status = (body?.status || "active").toString();
  const overrides = body?.overrides && typeof body.overrides === "object" ? body.overrides : {};

  if (!fee_code) return bad(400, "missing_fee_code");

  try {
    // Ensure unique by (merchant_id, fee_code); if constraint doesn't exist,
    // fallback to update-then-insert.
    const up = await sql(
      `INSERT INTO merchant_fee_profiles (merchant_id, fee_code, overrides, status)
       VALUES ($1,$2,$3::jsonb,$4)
       ON CONFLICT (merchant_id, fee_code) DO UPDATE SET
         overrides = EXCLUDED.overrides,
         status = EXCLUDED.status,
         updated_at = NOW()
       RETURNING *`,
      [String(merchantId), String(fee_code), JSON.stringify(overrides), status],
    );
    return ok({ profile: up?.[0] });
  } catch (e) {
    // Fallback path (no unique constraint)
    try {
      const updated = await sql(
        "UPDATE merchant_fee_profiles SET overrides=$1::jsonb, status=$2, updated_at=NOW() WHERE merchant_id=$3 AND fee_code=$4 RETURNING *",
        [JSON.stringify(overrides), status, String(merchantId), String(fee_code)],
      );
      if (updated?.[0]) return ok({ profile: updated[0] });
      const inserted = await sql(
        "INSERT INTO merchant_fee_profiles (merchant_id, fee_code, overrides, status) VALUES ($1,$2,$3::jsonb,$4) RETURNING *",
        [String(merchantId), String(fee_code), JSON.stringify(overrides), status],
      );
      return ok({ profile: inserted?.[0] });
    } catch (e2) {
      console.error("/api/admin/merchants/[id]/fee-profiles POST error", e2);
      return bad(500, "server_error");
    }
  }
}


