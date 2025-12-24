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

  const posted = await sql(
    `SELECT currency, SUM(amount) AS total
     FROM billing_ledger
     WHERE direction = 'CREDIT' AND status = 'posted'
     GROUP BY currency`,
  );
  const pending = await sql(
    `SELECT currency, SUM(amount) AS total
     FROM billing_ledger
     WHERE direction = 'CREDIT' AND status = 'pending'
     GROUP BY currency`,
  );
  return ok({ revenue: posted || [], pending: pending || [] });
}
