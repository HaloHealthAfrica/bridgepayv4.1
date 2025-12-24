import { auth } from "@/auth";
import { startRequest } from "@/app/api/utils/logger";
import sql from "@/app/api/utils/sql";

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

export async function POST(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/invoices/[id]/send" });
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

    return Response.json(
      { ok: false, reason: "email_disabled" },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
