import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";

function isAdmin(role) {
  return role === "admin";
}

function maskPhone(p) {
  if (!p) return null;
  const s = String(p);
  return s.length > 2
    ? `${"*".repeat(Math.max(0, s.length - 2))}${s.slice(-2)}`
    : "**";
}
function maskEmail(e) {
  if (!e) return null;
  const [a, b] = String(e).split("@");
  return a && b ? `${a[0]}***@${b[0]}***` : "*";
}

export async function GET(request, { params }) {
  const reqMeta = startRequest({
    request,
    route: "/api/payments/receipt/[id]",
  });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    const id = Number(params?.id);
    if (!id) {
      return Response.json(
        {
          ok: false,
          error: "validation_error",
          details: [{ field: "id", message: "invalid" }],
        },
        { status: 400, headers: reqMeta.header() },
      );
    }

    const rows =
      await sql`SELECT * FROM mpesa_payments WHERE id = ${id} LIMIT 1`;
    const p = rows?.[0];
    if (!p) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }

    // Enforce access: admin or creator
    let role = session.user.role;
    if (!role) {
      try {
        const r =
          await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
        role = r?.[0]?.role;
      } catch {}
    }
    const isCreator = String(p.user_id) === String(session.user.id);
    if (!isAdmin(role) && !isCreator) {
      return Response.json(
        { ok: false, error: "forbidden" },
        { status: 403, headers: reqMeta.header() },
      );
    }

    const meta = p.metadata || {};
    const payerPhone =
      meta?.sent_payload?.phone_number || meta?.sent_payload?.wallet_no || null;
    const payerEmail = meta?.sent_payload?.email || null;
    const transactionId =
      meta?.provider_response?.transaction_id ||
      meta?.provider_response?.data?.transaction_id ||
      null;
    const reference =
      meta?.order_reference ||
      meta?.sent_payload?.reference ||
      meta?.sent_payload?.order_reference ||
      null;

    const receipt = {
      ok: true,
      receiptId: `rcpt_${p.id}`,
      paymentId: p.id,
      createdAt: p.created_at,
      completedAt: p.status === "completed" ? p.updated_at : null,
      payer: {
        name: meta?.payer_name || null,
        phone: maskPhone(payerPhone),
        email: maskEmail(payerEmail),
      },
      amount: p.amount,
      currency: meta?.sent_payload?.currency || "KES",
      status: p.status,
      reference,
      provider_ref: p.provider_ref || null,
      transaction_id: transactionId,
      lineItems: [
        {
          title: meta?.sent_payload?.description || "Payment",
          amount: p.amount,
        },
      ],
    };

    return Response.json(receipt, { headers: reqMeta.header() });
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500, headers: reqMeta.header() },
    );
  }
}
