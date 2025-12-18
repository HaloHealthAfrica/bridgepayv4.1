import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    const userId = session.user.id;

    let body = {};
    try {
      body = await request.json();
    } catch {}

    // Defaults if not provided
    const defaults = {
      bridge: 20000,
      kcb: 50000,
      dtb: 35000,
      mpesa: 10000,
    };
    const provided = body?.balances || {};
    const payload = {
      bridge: Number(provided.bridge ?? defaults.bridge),
      kcb: Number(provided.kcb ?? defaults.kcb),
      dtb: Number(provided.dtb ?? defaults.dtb),
      mpesa: Number(provided.mpesa ?? defaults.mpesa),
    };

    // Upsert each source for the user
    const sources = ["bridge", "kcb", "dtb", "mpesa"];
    for (const s of sources) {
      const bal = payload[s];
      await sql(
        `INSERT INTO wallet_sources (user_id, source, currency, balance, hold, status, metadata)
         VALUES ($1, $2, $3, $4, 0, 'active', '{}'::jsonb)
         ON CONFLICT (user_id, source, currency)
         DO UPDATE SET balance = EXCLUDED.balance, updated_at = now()`,
        [userId, s, "KES", bal],
      );
    }

    const rows =
      await sql`SELECT source, currency, balance, hold, status FROM wallet_sources WHERE user_id = ${userId} ORDER BY source`;
    return Response.json({ ok: true, sources: rows }, { status: 200 });
  } catch (e) {
    console.error("/api/wallet/sources/seed POST error", e);
    return Response.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 },
    );
  }
}
