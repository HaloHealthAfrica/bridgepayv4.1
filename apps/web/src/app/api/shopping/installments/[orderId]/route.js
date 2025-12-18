import { auth } from "@/auth";
import { InstallmentService, OrderService } from "@/app/api/shopping/_services";

function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}
function ok(json) {
  return Response.json({ ok: true, ...json }, { status: 200 });
}

// POST: create plan for an order
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return bad(401, "unauthorized");
    const { orderId } = params || {};
    if (!orderId) return bad(400, "order_id_required");
    let body = {};
    try {
      body = await request.json();
    } catch {}
    const { mode, schedule } = body || {};

    const order = await OrderService.getById(orderId);
    if (!order) return bad(404, "order_not_found");
    if (order.customer_user_id !== session.user.id)
      return bad(403, "forbidden");
    if (!["INSTALLMENT_PAY_AFTER", "DELIVER_THEN_COLLECT"].includes(mode))
      return bad(400, "invalid_mode");

    const plan = await InstallmentService.createPlan({
      orderId,
      mode,
      schedule,
    });
    return ok({ plan });
  } catch (e) {
    console.error("/api/shopping/installments/[orderId] POST error", e);
    return bad(500, "server_error");
  }
}
