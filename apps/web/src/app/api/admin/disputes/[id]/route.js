import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isAdmin(role) {
  return role === "admin";
}

export async function GET(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/admin/disputes/[id]" });
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

  const rows =
    await sql`SELECT id, payment_id, external_id, amount, currency, reason, status, due_at, metadata, created_at, updated_at FROM disputes WHERE id = ${id} LIMIT 1`;
  const dispute = rows?.[0];
  if (!dispute) {
    return Response.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: reqMeta.header() },
    );
  }
  let payment = null;
  if (dispute.payment_id) {
    const p =
      await sql`SELECT id, amount, status, provider_ref, order_reference, created_at FROM mpesa_payments WHERE id = ${dispute.payment_id} LIMIT 1`;
    payment = p?.[0] || null;
  }
  return Response.json(
    { ok: true, dispute, payment },
    { status: 200, headers: reqMeta.header() },
  );
}
