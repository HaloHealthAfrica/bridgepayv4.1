import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isAdmin(role) {
  return role === "admin";
}

export async function GET(request) {
  const reqMeta = startRequest({ request, route: "/api/admin/disputes" });
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: reqMeta.header() },
    );
  }
  let role = session.user.role;
  if (!role) {
    try {
      const r =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isAdmin(role)) {
    return Response.json(
      { ok: false, error: "forbidden" },
      { status: 403, headers: reqMeta.header() },
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const created_after = searchParams.get("created_after");
  const q = searchParams.get("q");

  let where = [];
  let params = [];
  let p = 1;
  if (status) {
    where.push(`status = $${p++}`);
    params.push(status);
  }
  if (created_after) {
    where.push(`created_at >= $${p++}`);
    params.push(new Date(created_after));
  }
  if (q) {
    where.push(`(external_id ILIKE $${p++})`);
    params.push(`%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await sql(
    `SELECT id, payment_id, external_id, amount, currency, reason, status, due_at, created_at
     FROM disputes ${whereSql}
     ORDER BY created_at DESC
     LIMIT 100`,
    params,
  );
  return Response.json(
    { ok: true, disputes: rows },
    { status: 200, headers: reqMeta.header() },
  );
}
