import { auth } from "@/auth";
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

    // Ownership check: customer must be the current user
    const res = await OrderService.getById(id);
    if (!res) return bad(404, "order_not_found");
    if (res.customer_user_id !== session.user.id) return bad(403, "forbidden");

    await OrderService.payNow({ orderId: id });
    return ok({ orderId: id, status: "COMPLETED" });
  } catch (e) {
    console.error("/api/shopping/orders/[id]/pay-now POST error", e);
    return bad(500, "server_error");
  }
}
