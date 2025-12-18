import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }
  const rows = await sql(
    `SELECT * FROM wallet_webhook_events
     ORDER BY received_at DESC
     LIMIT 100`,
  );
  return successResponse({ items: rows });
});
