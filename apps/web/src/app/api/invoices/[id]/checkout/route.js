import sql from "@/app/api/utils/sql";
import lemonade from "@/app/api/utils/lemonadeClient";
import { startRequest } from "@/app/api/utils/logger";
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";
import {
  mapToLemonadePayload,
  validateLemonadePayload,
} from "@/app/api/payments/lemonade/_mapping";

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
  if (["success", "succeeded", "completed", "complete"].includes(s))
    return "completed";
  if (["failed", "declined", "rejected", "error"].includes(s)) return "failed";
  return "pending";
}

export async function POST(request, { params: { id } }) {
  const reqMeta = startRequest({
    request,
    route: "/api/invoices/[id]/checkout",
  });
  try {
    // Parse input
    let body = null;
    try {
      body = await request.json();
    } catch {}
    const method = (body?.method || "").toLowerCase();
    if (!["stk", "wallet"].includes(method)) {
      return Response.json(
        { ok: false, error: "invalid_method" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // Load invoice (public allowed)
    const rows =
      await sql`SELECT * FROM invoices WHERE id = ${Number(id)} LIMIT 1`;
    const invoice = rows?.[0];
    if (!invoice) {
      return Response.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: reqMeta.header() },
      );
    }
    if (!["draft", "sent"].includes(String(invoice.status))) {
      return Response.json(
        { ok: false, error: "not_payable" },
        { status: 400, headers: reqMeta.header() },
      );
    }
    if (!(Number(invoice.total) > 0)) {
      return Response.json(
        { ok: false, error: "invalid_total" },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // Build order reference (idempotent per-invoice)
    const order_reference = `inv-${invoice.id}`;

    // Idempotency check
    const idem = await findIdempotent(order_reference);
    if (idem && idem.payment_id) {
      return Response.json(
        { ok: true, payment_id: idem.payment_id, from_cache: true },
        { headers: reqMeta.header() },
      );
    }

    // Build raw payload
    const rawPayload = {
      amount: Number(invoice.total),
      order_reference,
      currency: invoice.currency || "KES",
      description: `Invoice ${invoice.id}`,
      ...(method === "stk"
        ? { phone_number: body?.phone_number }
        : { wallet_no: body?.wallet_no }),
    };

    // Map to Lemonade v2 shape
    const action = method === "stk" ? "stk_push" : "wallet_payment";
    const lemonPayload = mapToLemonadePayload(action, rawPayload);
    const missing = validateLemonadePayload(action, lemonPayload);
    if (missing) {
      return Response.json(
        { ok: false, error: "missing_fields", missing, sent: lemonPayload },
        { status: 400, headers: reqMeta.header() },
      );
    }

    // Insert pending payment linked to invoice
    const ins = await sql(
      "INSERT INTO mpesa_payments (user_id, type, amount, status, order_reference, metadata) VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING id",
      [
        0, // public checkout (no user); you can associate later if logged in
        action === "stk_push" ? "paybill" : "till",
        Number(invoice.total),
        "pending",
        order_reference,
        JSON.stringify({
          invoice_id: invoice.id,
          action,
          sent_payload: lemonPayload,
          provider: "lemonade",
        }),
      ],
    );
    const paymentId = ins?.[0]?.id;

    // Provider call via Relay
    const res = await lemonade.call({
      action,
      payload: lemonPayload,
      mode: "relay",
      correlationId: reqMeta.id,
      idempotencyKey: order_reference,
    });

    const status = res?.ok ? mapProviderStatus(res?.data) : "pending";

    // Update payment row
    await sql(
      "UPDATE mpesa_payments SET status = $1, metadata = metadata || $2::jsonb, updated_at = NOW() WHERE id = $3",
      [
        status,
        JSON.stringify({ provider_response: res?.data || null }),
        paymentId,
      ],
    );

    await saveIdempotent(order_reference, paymentId, {
      ok: !!res?.ok,
      payment_id: paymentId,
    });

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          payment_id: paymentId,
          status,
          provider: res?.data || null,
          sent: lemonPayload,
        },
        { status: res?.status || 400, headers: reqMeta.header() },
      );
    }

    return Response.json(
      { ok: true, payment_id: paymentId },
      { headers: reqMeta.header() },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e?.message || "unknown_error" },
      { status: 500 },
    );
  }
}
