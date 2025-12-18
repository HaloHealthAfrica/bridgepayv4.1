import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

async function canView(sessionUserId, role, paymentUserId) {
  if (!sessionUserId) return false;
  if (role === "admin" || role === "merchant") return true;
  return String(sessionUserId) === String(paymentUserId);
}

export async function GET(request, { params: { id } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
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

    const rows =
      await sql`SELECT * FROM mpesa_payments WHERE id = ${id} LIMIT 1`;
    const payment = rows?.[0];
    if (!payment) {
      return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const allowed = await canView(session.user.id, role, payment.user_id);
    if (!allowed) {
      return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const txns = await sql`
      SELECT * FROM mpesa_transactions
      WHERE payment_id = ${id}
      ORDER BY created_at DESC, id DESC
    `;

    return Response.json({ ok: true, payment, transactions: txns || [] });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
