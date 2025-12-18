import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

export const GET = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/admin/disputes" });
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const created_after = searchParams.get("created_after");
  const q = searchParams.get("q");

  let where = [];
  let params = [];
  let p = 1;
  if (status) {
    where.push(`status = $${p++}`);
    params.push(status);
  }
  if (created_after) {
    where.push(`created_at >= $${p++}`);
    params.push(new Date(created_after));
  }
  if (q) {
    where.push(`(external_id ILIKE $${p++})`);
    params.push(`%${q}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await sql(
    `SELECT id, payment_id, external_id, amount, currency, reason, status, due_at, created_at
     FROM disputes ${whereSql}
     ORDER BY created_at DESC
     LIMIT 100`,
    params,
  );
  return successResponse(
    { disputes: rows },
    200,
    reqMeta.header()
  );
});
