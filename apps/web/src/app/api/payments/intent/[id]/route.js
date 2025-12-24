import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function ok(json, status = 200) {
  return Response.json({ ok: true, ...json }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

function isAdmin(role) {
  return role === "admin" || role === "merchant";
}

export async function GET(request, { params }) {
  const { id } = params || {};
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

  const rows = await sql(
    "SELECT * FROM payment_intents WHERE id = $1 LIMIT 1",
    [id],
  );
  const intent = rows?.[0];
  if (!intent) return bad(404, "not_found");
  if (!isAdmin(role) && String(intent.user_id) !== String(session.user.id)) {
    return bad(403, "forbidden");
  }

  const ext = await sql(
    "SELECT id, type, amount, currency, lemon_tx_id, status, metadata, created_at FROM external_payments WHERE payment_intent_id = $1 ORDER BY created_at ASC",
    [id],
  );

  return ok({ intent, external: ext || [] });
}
