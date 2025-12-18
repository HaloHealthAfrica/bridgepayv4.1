import { auth } from "@/auth";
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
    if (index == null) return bad(400, "index_required");

    const res = await InstallmentService.payInstallment({
      planId: id,
      index: Number(index),
    });
    return ok({ paid: true, ...res });
  } catch (e) {
    console.error("/api/shopping/installments/[id]/pay POST error", e);
    return bad(500, "server_error");
  }
}
