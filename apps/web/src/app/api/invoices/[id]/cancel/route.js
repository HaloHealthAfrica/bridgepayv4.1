import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function POST(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/invoices/[id]/cancel" });
  try {
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
    if (!isPrivileged(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }
    const rows =
      await sql`SELECT status FROM invoices WHERE id = ${Number(id)} LIMIT 1`;
    const inv = rows?.[0];
    if (!inv)
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    if (!["draft", "sent"].includes(String(inv.status))) {
      return Response.json(
        { ok: false, error: "invalid_state" },
        { status: 400, headers: reqMeta.header() },
      );
    }
    await sql`UPDATE invoices SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW() WHERE id = ${Number(id)}`;
    return Response.json({ ok: true }, { headers: reqMeta.header() });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
