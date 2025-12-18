import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/admin/users
 * List all users (admin only)
 * Query params: limit, cursor, q (search), role, kyc_status
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const { limit, cursor } = parsePaginationParams(searchParams);
  const searchQuery = searchParams.get('q') || '';
  const roleFilter = searchParams.get('role') || '';
  const kycStatus = searchParams.get('kyc_status') || '';

  // Build query
  let query = sql`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      COALESCE(u.role, 'customer') AS role,
      u.created_at,
      u.kyc_status,
      COALESCE(SUM(w.balance), 0)::numeric AS balance
    FROM auth_users u
    LEFT JOIN wallets w ON u.id = w.user_id
  `;

  const conditions = [];

  // Apply search query
  if (searchQuery) {
    const searchPattern = `%${searchQuery}%`;
    conditions.push(sql`(
      u.name ILIKE ${searchPattern} OR
      u.email ILIKE ${searchPattern} OR
      u.phone ILIKE ${searchPattern}
    )`);
  }

  // Apply role filter
  if (roleFilter && roleFilter !== 'all') {
    conditions.push(sql`COALESCE(u.role, 'customer') = ${roleFilter}`);
  }

  // Apply KYC status filter
  if (kycStatus && kycStatus !== 'all') {
    if (kycStatus === 'verified') {
      conditions.push(sql`u.kyc_status = 'verified'`);
    } else if (kycStatus === 'pending') {
      conditions.push(sql`(u.kyc_status IS NULL OR u.kyc_status = 'pending')`);
    }
  }

  if (conditions.length > 0) {
    query = sql`${query} WHERE ${sql.join(conditions, sql` AND `)}`;
  }

  query = sql`${query} GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at, u.kyc_status`;

  // Apply cursor pagination
  if (cursor) {
    query = sql`${query} HAVING u.created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY u.created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  const formattedItems = items.map((row) => ({
    id: row.id,
    name: row.name || row.email?.split('@')[0] || 'User',
    email: row.email,
    phone: row.phone || '-',
    role: row.role || 'customer',
    kyc: row.kyc_status || 'pending',
    balance: Number(row.balance || 0),
    joined: new Date(row.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }));

  return successResponse(createPaginationResponse(formattedItems, nextCursor, hasMore, limit));
});

