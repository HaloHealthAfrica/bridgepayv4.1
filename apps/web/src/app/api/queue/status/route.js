/**
 * Queue Status Endpoint
 * Returns status of all queues (admin only)
 */

import { auth } from "@/auth";
import { getQueueStatus } from "@/app/api/utils/queue";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { adminOnlyMiddleware } from "@/app/api/middleware/adminOnly";

/**
 * GET /api/queue/status
 * Get status of all queues (admin only)
 */
export const GET = withErrorHandling(async (request) => {
  // Check admin access
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Check if user is admin
  let role = session.user.role;
  if (!role) {
    const sql = await import("@/app/api/utils/sql");
    const rows = await sql.default`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
    role = rows?.[0]?.role;
  }

  if (role !== 'admin') {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: 'Admin access required',
    });
  }

  // Get queue status
  const status = await getQueueStatus();

  return successResponse({
    queues: status,
    timestamp: new Date().toISOString(),
  });
});

