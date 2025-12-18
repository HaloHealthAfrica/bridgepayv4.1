/**
 * Queue Payment Intent
 * Add payment intent to queue for async processing
 */

import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { getPaymentQueue } from "@/app/api/utils/queue";

/**
 * POST /api/payments/intent/queue
 * Queue a payment intent for async processing
 */
export const POST = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON);
  }

  const intentId = body.intent_id;
  if (!intentId) {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "intent_id is required",
    });
  }

  // Verify intent exists and belongs to user
  const intent = await sql(
    "SELECT id, user_id, status FROM payment_intents WHERE id = $1",
    [intentId]
  );

  if (!intent || intent.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment intent not found",
    });
  }

  if (intent[0].user_id !== session.user.id) {
    return errorResponse(ErrorCodes.FORBIDDEN);
  }

  if (intent[0].status !== "PENDING") {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: `Payment intent is ${intent[0].status}, cannot queue`,
    });
  }

  // Get payment queue and add job
  const { queuePayment } = await getPaymentQueue();
  
  const payload = body.payload || {};
  const options = {
    priority: body.priority || 0,
    delay: body.delay || 0,
  };

  const job = await queuePayment(intentId, payload, options);

  return successResponse({
    job_id: job.id,
    intent_id: intentId,
    status: "queued",
    queued_at: new Date().toISOString(),
  });
});

