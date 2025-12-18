import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";

function isAdmin(role) {
  return role === "admin";
}

/**
 * GET /api/billing/ledger
 * Get billing ledger entries (admin only)
 * Query params: limit (default: 20, max: 100), cursor (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  let role = session?.user?.role;
  if (!role) {
    try {
      const r = await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isAdmin(role)) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Admin access required",
    });
  }

  const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);

  // Build query with pagination
  let query = sql`SELECT * FROM billing_ledger WHERE 1=1`;

  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  return successResponse(createPaginationResponse(items, nextCursor, hasMore, limit));
});
