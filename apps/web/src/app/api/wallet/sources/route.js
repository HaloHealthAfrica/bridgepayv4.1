import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    const userId = session.user.id;
    const rows =
      await sql`SELECT id, source, currency, balance, hold, status, metadata, created_at, updated_at FROM wallet_sources WHERE user_id = ${userId} ORDER BY source`;
    return Response.json({ ok: true, sources: rows }, { status: 200 });
  } catch (e) {
    console.error("/api/wallet/sources GET error", e);
    return Response.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 },
    );
  }
}
