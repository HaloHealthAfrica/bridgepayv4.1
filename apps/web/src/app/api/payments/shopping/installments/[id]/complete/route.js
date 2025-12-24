import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";

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
    if (!id) return bad(400, "plan_id_required");

    const idemKey =
      request.headers.get("Idempotency-Key") ||
      `shopping-installment-complete-${id}`;
    const found = await findIdempotent(idemKey);
    if (found?.response) return ok(found.response);

    const plan = (
      await sql`SELECT status FROM installment_plans WHERE id = ${id} LIMIT 1`
    )?.[0];
    if (!plan) return bad(404, "plan_not_found");
    if (plan.status !== "completed") return bad(409, "not_completed");

    const resp = { planId: id, status: "completed" };
    await saveIdempotent(idemKey, Number(id) || 0, resp);
    return ok(resp);
  } catch (e) {
    console.error(
      "/api/payments/shopping/installments/[id]/complete POST error",
      e,
    );
    return bad(500, "server_error");
  }
}
