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

export async function GET(request) {
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

  const url = new URL(request.url);
  const limit = Math.min(
    500,
    Math.max(1, Number(url.searchParams.get("limit")) || 200),
  );
  const rows = await sql(
    `SELECT * FROM billing_ledger ORDER BY created_at DESC LIMIT ${limit}`,
  );
  return ok({ items: rows || [] });
}
