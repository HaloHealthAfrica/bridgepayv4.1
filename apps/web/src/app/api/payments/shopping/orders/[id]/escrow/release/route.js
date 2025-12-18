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
      request.headers.get("Idempotency-Key") || `shopping-escrow-release-${id}`;
    const found = await findIdempotent(idemKey);
    if (found?.response) return ok(found.response);

    const order = await OrderService.getById(id);
    if (!order) return bad(404, "order_not_found");
    // merchant/admin auth could be enforced here; keeping parity with existing route service level checks

    await OrderService.escrowRelease({ orderId: id });
    const resp = { orderId: id, status: "COMPLETED" };
    await saveIdempotent(idemKey, Number(id) || 0, resp);
    return ok(resp);
  } catch (e) {
    console.error(
      "/api/payments/shopping/orders/[id]/escrow/release POST error",
      e,
    );
    return bad(500, "server_error");
  }
}
