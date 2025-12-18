import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isMerchant(role) {
  return role === "admin" || role === "merchant";
}

export async function GET(request) {
  const reqMeta = startRequest({ request, route: "/api/qr" });
  try {
    const session = await auth();
    let role = session?.user?.role || null;
    if (!role && session?.user?.id) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role || null;
      } catch {}
    }
    if (!session?.user?.id || !isMerchant(role)) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

    const rows =
      await sql`SELECT code, mode, amount, currency, status, expires_at, created_at FROM qr_codes ORDER BY created_at DESC LIMIT ${limit}`;

    return Response.json(
      { ok: true, items: rows || [] },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
