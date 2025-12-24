import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

function ok(data, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}
function bad(status, error, extra = {}) {
  return Response.json({ ok: false, error, ...extra }, { status });
}

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) return bad(401, "unauthorized");
  const { id } = params || {};
  if (!id) return bad(400, "missing_id");
  const rows = await sql(
    "SELECT * FROM billing_ledger WHERE transaction_id = $1 ORDER BY created_at ASC",
    [String(id)],
  );
  return ok({ items: rows || [] });
}
