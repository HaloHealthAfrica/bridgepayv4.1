import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { auth } from "@/auth";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function GET(request, { params: { id } }) {
  const reqMeta = startRequest({
    request,
    route: "/api/invoices/[id]/payments",
  });
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
    const rows = await sql`
      SELECT id, status, provider_ref, amount, order_reference, created_at
      FROM mpesa_payments
      WHERE (metadata ->> 'invoice_id')::int = ${Number(id)}
      ORDER BY created_at DESC
    `;
    return Response.json(
      { ok: true, payments: rows || [] },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
