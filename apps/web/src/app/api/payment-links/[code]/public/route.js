import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";

/**
 * GET /api/payment-links/[code]/public
 * Get public payment link information (no authentication required)
 */
export const GET = withErrorHandling(async (request, { params: { code } }) => {
  if (!code || typeof code !== 'string') {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Payment link code is required",
    });
  }

  const link = await sql`
    SELECT 
      id,
      code,
      amount,
      currency,
      description,
      status,
      expires_at,
      created_at
    FROM payment_links
    WHERE code = ${code}
    LIMIT 1
  `;

  if (link.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment link not found",
    });
  }

  const linkData = link[0];

  // Check if expired
  if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
    // Update status to expired
    await sql`UPDATE payment_links SET status = 'expired' WHERE id = ${linkData.id}`;
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: "Payment link has expired",
    });
  }

  // Check if already paid or cancelled
  if (linkData.status !== 'active') {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: `Payment link is ${linkData.status}`,
    });
  }

  return successResponse({
    code: linkData.code,
    amount: Number(linkData.amount),
    currency: linkData.currency,
    description: linkData.description,
    expires_at: linkData.expires_at ? new Date(linkData.expires_at).toISOString() : null,
  });
});

