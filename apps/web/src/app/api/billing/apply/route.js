import { auth } from "@/auth";
import { applyFees } from "@/app/api/billing/_helpers";

function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) return bad(401, "unauthorized");
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const {
    transactionType,
    transactionId,
    baseAmount,
    currency = "KES",
    merchantId = null,
    fundingPlan = null,
    customerWalletId = null,
    idempotencyKey = null,
  } = body || {};
  if (!transactionType || !transactionId || !(Number(baseAmount) > 0)) {
    return bad(400, "missing_fields");
  }
  try {
    const res = await applyFees({
      transactionType,
      transactionId: String(transactionId),
      baseAmount: Number(baseAmount),
      currency,
      merchantId,
      fundingPlan,
      idempotencyKey,
      customerWalletId,
    });
    return ok(res);
  } catch (e) {
    console.error("/api/billing/apply POST error", e);
    return bad(500, "server_error");
  }
}
