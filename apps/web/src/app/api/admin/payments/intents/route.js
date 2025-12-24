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

export async function GET(request) {
  const session = await auth();
  if (!(await requireAdmin(session))) return bad(403, "forbidden");

  const url = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit")) || 100),
  );
  const status = url.searchParams.get("status") || null;
  const q = (url.searchParams.get("q") || "").trim();

  const where = [];
  const params = [];
  let p = 1;
  if (status) {
    where.push(`pi.status = $${p++}`);
    params.push(status);
  }
  if (q) {
    where.push(
      `(CAST(pi.id AS text) ILIKE $${p++} OR CAST(pi.user_id AS text) ILIKE $${p++} OR CAST(pi.merchant_id AS text) ILIKE $${p++})`,
    );
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await sql(
    `SELECT pi.*,
            u.email AS user_email,
            mu.email AS merchant_email
     FROM payment_intents pi
     LEFT JOIN auth_users u ON u.id = pi.user_id
     LEFT JOIN auth_users mu ON mu.id::text = pi.merchant_id::text
     ${whereSql}
     ORDER BY pi.created_at DESC
     LIMIT ${limit}`,
    params,
  );

  return ok({ items: rows || [] });
}


