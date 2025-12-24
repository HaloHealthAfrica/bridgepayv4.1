import { auth } from "@/auth";
import { calculateFees } from "@/app/api/billing/_helpers";

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
    appliesTo,
    amount,
    currency = "KES",
    merchantId = null,
    fundingPlan = null,
  } = body || {};
  if (!appliesTo || !(Number(amount) > 0)) return bad(400, "missing_fields");
  try {
    const calc = await calculateFees({
      appliesTo,
      amount: Number(amount),
      currency,
      merchantId,
      fundingPlan,
    });
    return ok({ ...calc });
  } catch (e) {
    console.error("/api/billing/calculate POST error", e);
    return bad(500, "server_error");
  }
}
