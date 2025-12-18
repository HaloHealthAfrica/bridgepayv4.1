import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/admin/implementers
 * Get list of all implementers (admin only)
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const rows = await sql`
    SELECT 
      id,
      name,
      email,
      role,
      created_at
    FROM auth_users
    WHERE role = 'implementer'
    ORDER BY name ASC, email ASC
  `;

  return successResponse({
    implementers: rows.map(row => ({
      id: row.id,
      name: row.name || row.email?.split('@')[0] || 'Unknown',
      email: row.email,
      createdAt: row.created_at,
    })),
  });
});

