import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { recordMetric } from "@/app/api/utils/metrics";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";
import { ensureMerchantOrAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/merchant/refunds
 * List refunds for merchant/admin
 * Query params: status (optional), limit (default: 20), cursor (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/merchant/refunds" });
  const startedAt = Date.now();
  const guard = await ensureMerchantOrAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const { limit, cursor } = parsePaginationParams(searchParams);

  // Build query with pagination
  let query = sql`
    SELECT 
      id, payment_id, amount, currency, reason, status, provider_ref, refund_reference, created_at, updated_at
    FROM refunds
    WHERE 1=1
  `;

  if (status) {
    query = sql`${query} AND status = ${status}`;
  }

  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  recordMetric({
    route: "refunds.list",
    durationMs: Date.now() - startedAt,
    error: false,
  });

  return successResponse(
    createPaginationResponse(items, nextCursor, hasMore, limit),
    200,
    reqMeta.header()
  );
});
