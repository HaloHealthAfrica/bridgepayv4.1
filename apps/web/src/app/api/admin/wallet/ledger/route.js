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
    `SELECT l.*, u.email AS user_email
     FROM wallet_ledger l
     JOIN wallets w ON w.id = l.wallet_id
     LEFT JOIN auth_users u ON u.id = w.user_id
     ORDER BY l.created_at DESC
     LIMIT 100`,
  );
  return successResponse({ items: rows });
});
