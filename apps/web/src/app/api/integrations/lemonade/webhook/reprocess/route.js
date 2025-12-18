import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { writeAudit } from "@/app/api/utils/audit";

function isAdmin(role) {
  return role === "admin";
}

function mapProviderStatus(data) {
  const s = String(
    (
      data?.status ||
      data?.transaction_status ||
      data?.payment_status ||
      data?.data?.status ||
      ""
    ).toString(),
  ).toLowerCase();
  if (["success", "succeeded", "completed", "complete", "paid"].includes(s))
    return "completed";
  if (["failed", "declined", "rejected", "error"].includes(s)) return "failed";
  return "pending";
}

function pickRef(payload) {
  return (
    payload?.transaction_id ||
    payload?.provider_ref ||
    payload?.provider_reference ||
    payload?.data?.transaction_id ||
    payload?.reference ||
    null
  );
}

export async function POST(request) {
  const reqMeta = startRequest({
    request,
    route: "/api/integrations/lemonade/webhook/reprocess",
  });
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { ok: false, error: "unauthorized" },
        { status: 401, headers: reqMeta.header() },
      );
    }
    let role = session?.user?.role;
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

    let body = null;
    try {
      body = await request.json();
    } catch {}
    const eventId = Number(body?.eventId) || null;
    const paymentId = Number(body?.paymentId) || null;

    let event = null;
    if (eventId) {
      const rows =
        await sql`SELECT * FROM mpesa_transactions WHERE id = ${eventId} LIMIT 1`;
      event = rows?.[0] || null;
    } else if (paymentId) {
      const rows =
        await sql`SELECT * FROM mpesa_transactions WHERE payment_id = ${paymentId} ORDER BY created_at DESC LIMIT 1`;
      event = rows?.[0] || null;
    }

    if (!event) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }

    const raw = event.raw || {};
    const ref = pickRef(raw);

    let payment = null;
    if (ref) {
      const rows = await sql`
        SELECT * FROM mpesa_payments
        WHERE provider_ref = ${ref}
           OR (metadata -> 'provider_response' ->> 'transaction_id') = ${ref}
           OR (metadata -> 'provider_response' -> 'data' ->> 'transaction_id') = ${ref}
           OR (metadata ->> 'order_reference') = ${ref}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      payment = rows?.[0] || null;
    } else if (event.payment_id) {
      const rows =
        await sql`SELECT * FROM mpesa_payments WHERE id = ${event.payment_id} LIMIT 1`;
      payment = rows?.[0] || null;
    }

    if (!payment) {
      return Response.json(
        { ok: false, error: "payment_not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }

    const newStatus = mapProviderStatus(raw);

    await sql(
      "UPDATE mpesa_payments SET status = $1, metadata = metadata || $2::jsonb, updated_at = NOW() WHERE id = $3",
      [
        newStatus,
        JSON.stringify({ reprocessed_from_event: event.id }),
        payment.id,
      ],
    );

    await writeAudit({
      userId: session.user.id,
      action: "payments.webhook_update",
      metadata: {
        correlationId: reqMeta.id,
        paymentId: payment.id,
        reprocess: true,
      },
    });

    return Response.json(
      { ok: true, payment_id: payment.id, new_status: newStatus },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
