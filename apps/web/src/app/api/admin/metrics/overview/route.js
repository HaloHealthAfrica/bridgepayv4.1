import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

export const GET = withErrorHandling(async (request) => {
  const reqMeta = startRequest({
    request,
    route: "/api/admin/metrics/overview",
  });
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

    const hasWebhookSecret = !!process.env.LEMONADE_WEBHOOK_SECRET;

    // last webhook event
    const lastRows = await sql`
      SELECT created_at, status FROM mpesa_transactions
      WHERE (raw ->> 'source') = 'webhook'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const lastWebhookAt = lastRows?.[0]?.created_at || null;
    const lastWebhookStatus = lastRows?.[0]?.status || null;

    // counts last 24h
    const verifiedRows = await sql`
      SELECT COUNT(*)::int AS c FROM mpesa_transactions
      WHERE (raw ->> 'source') = 'webhook' AND (raw ->> 'verified') = 'true' AND created_at > NOW() - INTERVAL '24 hours'
    `;
    const webhookVerifiedCount = verifiedRows?.[0]?.c || 0;

    const failedSigRows = await sql`
      SELECT COUNT(*)::int AS c FROM audit_logs
      WHERE action = 'payments.webhook_received' AND (metadata ->> 'invalidSignature') = 'true' AND created_at > NOW() - INTERVAL '24 hours'
    `;
    const webhookFailedSignatures = failedSigRows?.[0]?.c || 0;

    return successResponse(
      {
        hasWebhookSecret,
        lastWebhookAt,
        lastWebhookStatus,
        webhookVerifiedCount,
        webhookFailedSignatures,
      },
      200,
      reqMeta.header()
    );
});
