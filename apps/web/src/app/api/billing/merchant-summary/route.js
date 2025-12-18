import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) return bad(401, "unauthorized");
  // Merchant id is flexible text; infer merchantId from query or user's email
  const url = new URL(request.url);
  const merchantId = url.searchParams.get("merchantId") || null;
  if (!merchantId) return bad(400, "missing_merchantId");

  const rows = await sql(
    `SELECT fee_code, currency, SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS total
     FROM billing_ledger
     WHERE payer_account = 'merchant' AND (metadata ->> 'merchantId') = $1
     GROUP BY fee_code, currency
     ORDER BY fee_code`,
    [String(merchantId)],
  );
  return ok({ items: rows || [] });
}
