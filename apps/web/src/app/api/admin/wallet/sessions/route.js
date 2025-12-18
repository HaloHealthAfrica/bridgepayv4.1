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
    `SELECT fs.*, u.email AS user_email
     FROM wallet_funding_sessions fs
     LEFT JOIN wallets w ON w.id = fs.wallet_id
     LEFT JOIN auth_users u ON u.id = fs.user_id
     ORDER BY fs.created_at DESC
     LIMIT 100`,
  );
  return successResponse({ items: rows });
});
