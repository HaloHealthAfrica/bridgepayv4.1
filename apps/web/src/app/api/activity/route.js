import { auth } from "@/auth";
import { listUserLedger } from "../wallet/_helpers";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 20);
    const filter = searchParams.get("filter") || "all";
    const rows = await listUserLedger({ userId: session.user.id, limit });
    const items = rows
      .filter((r) => {
        if (filter === "sent") return r.entry_type === "debit";
        if (filter === "received") return r.entry_type === "credit";
        return true;
      })
      .map((r) => ({
        id: r.id,
        type: r.entry_type,
        amount: Number(r.amount || 0),
        currency: r.currency,
        status: r.status,
        title:
          r.narration ||
          (r.entry_type === "credit" ? "Wallet credit" : "Wallet debit"),
        counterparty: r.counterparty_wallet_id ? "Bridge user" : undefined,
        time: new Date(r.created_at).toISOString(),
      }));
    return Response.json({ ok: true, items });
  } catch (e) {
    console.error("/api/activity GET error", e);
    return Response.json(
      { ok: false, error: e?.message || "server_error" },
      { status: 500 },
    );
  }
}
