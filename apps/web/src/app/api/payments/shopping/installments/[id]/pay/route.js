import { auth } from "@/auth";
import { findIdempotent, saveIdempotent } from "@/app/api/utils/idempotency";
import { InstallmentService } from "@/app/api/shopping/_services";

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

    let body = {};
    try {
      body = await request.json();
    } catch {}
    const { index } = body || {};
    if (typeof index !== "number") return bad(400, "index_required");

    const idemKey =
      request.headers.get("Idempotency-Key") ||
      `shopping-installment-pay-${id}-${index}`;
    const found = await findIdempotent(idemKey);
    if (found?.response) return ok(found.response);

    await InstallmentService.payInstallment({ planId: id, index });
    const resp = { planId: id, index, status: "PAID" };
    await saveIdempotent(idemKey, Number(id) || 0, resp);
    return ok(resp);
  } catch (e) {
    console.error("/api/payments/shopping/installments/[id]/pay POST error", e);
    return bad(500, "server_error");
  }
}
