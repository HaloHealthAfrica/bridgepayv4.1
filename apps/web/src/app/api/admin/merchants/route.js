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
  const q = (url.searchParams.get("q") || "").trim();

  const where = [`COALESCE(role,'customer') = 'merchant'`];
  const params = [];
  let p = 1;
  if (q) {
    where.push(`(email ILIKE $${p++} OR name ILIKE $${p++} OR CAST(id AS text) ILIKE $${p++})`);
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const rows = await sql(
    `SELECT id, name, email, COALESCE(role,'customer') AS role, "emailVerified", image
     FROM auth_users
     ${whereSql}
     ORDER BY id DESC
     LIMIT ${limit}`,
    params,
  );

  return ok({ items: rows || [] });
}


