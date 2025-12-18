import { auth } from "@/auth";
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";
import { OrderService } from "@/app/api/shopping/_services";

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}
function ok(json) {
  return Response.json({ ok: true, ...json }, { status: 200 });
}

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");

    const { id } = params || {};
    if (!id) return bad(400, "order_id_required");

    const idemKey =
      request.headers.get("Idempotency-Key") || `shopping-escrow-fund-${id}`;
    const found = await findIdempotent(idemKey);
    if (found?.response) return ok(found.response);

    const order = await OrderService.getById(id);
    if (!order) return bad(404, "order_not_found");
    if (order.customer_user_id !== session.user.id)
      return bad(403, "forbidden");
    if (order.payment_mode !== "ESCROW") return bad(400, "not_escrow_mode");

    let body = {};
    try {
      body = await request.json();
    } catch {}
    const { releaseCondition = "" } = body || {};

    await OrderService.escrowFund({ orderId: id, releaseCondition });
    const resp = { orderId: id, status: "IN_ESCROW" };
    await saveIdempotent(idemKey, Number(id) || 0, resp);
    return ok(resp);
  } catch (e) {
    console.error(
      "/api/payments/shopping/orders/[id]/escrow/fund POST error",
      e,
    );
    return bad(500, "server_error");
  }
}
