import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

async function requireAdmin(session) {
  if (!session?.user?.id) return false;
  let role = session.user.role;
  if (!role) {
    const r = await sql("SELECT role FROM auth_users WHERE id = $1 LIMIT 1", [
      session.user.id,
    ]);
    role = r?.[0]?.role;
  }
  return role === "admin" || role === "merchant";
}

export async function GET() {
  try {
    const session = await auth();
    if (!(await requireAdmin(session))) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const rows = await sql(
      `SELECT * FROM wallet_webhook_events
       ORDER BY received_at DESC
       LIMIT 100`,
    );
    return Response.json({ ok: true, items: rows });
  } catch (e) {
    console.error("/api/admin/wallet/webhooks GET error", e);
    return Response.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 },
    );
  }
}
