import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

export async function GET(request, { params: { id } }) {
  const reqMeta = startRequest({ request, route: "/api/invoices/[id]/status" });
  try {
    const rows =
      await sql`SELECT status, total, paid_at FROM invoices WHERE id = ${Number(id)} LIMIT 1`;
    const inv = rows?.[0];
    if (!inv) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    return Response.json({ ok: true, ...inv }, { headers: reqMeta.header() });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
