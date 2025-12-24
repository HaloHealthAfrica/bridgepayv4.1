import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    // get role (fallback to DB if not present on session)
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100
        ? limitParam
        : 20;

    let rows;
    if (role === "admin") {
      rows = await sql(
        "SELECT id, user_id, type, amount, status, provider_ref, order_reference, created_at, updated_at FROM mpesa_payments ORDER BY created_at DESC LIMIT $1",
        [limit],
      );
    } else if (role === "merchant") {
      rows = await sql(
        "SELECT id, user_id, type, amount, status, provider_ref, order_reference, created_at, updated_at FROM mpesa_payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2",
        [session.user.id, limit],
      );
    } else {
      // non-privileged cannot list globally
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    return Response.json({ ok: true, payments: rows || [] });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
