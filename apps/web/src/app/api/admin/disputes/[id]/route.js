import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import {
  successResponse,
  errorResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

export const GET = withErrorHandling(async (request, { params: { id } }) => {
  const reqMeta = startRequest({ request, route: "/api/admin/disputes/[id]" });
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const rows =
    await sql`SELECT id, payment_id, external_id, amount, currency, reason, status, due_at, metadata, created_at, updated_at FROM disputes WHERE id = ${id} LIMIT 1`;
  const dispute = rows?.[0];
  if (!dispute) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Dispute not found",
      headers: reqMeta.header(),
    });
  }
  let payment = null;
  if (dispute.payment_id) {
    const p =
      await sql`SELECT id, amount, status, provider_ref, order_reference, created_at FROM mpesa_payments WHERE id = ${dispute.payment_id} LIMIT 1`;
    payment = p?.[0] || null;
  }
  return successResponse(
    { dispute, payment },
    200,
    reqMeta.header()
  );
});
