import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";

const updatePaymentLinkSchema = yup.object({
  description: yup.string().max(500).nullable().optional(),
  expires_at: yup.date().nullable().optional(),
});

/**
 * GET /api/payment-links/[id]
 * Get payment link details (owner only)
 */
export const GET = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  if (!id || typeof id !== 'string') {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Payment link ID is required",
    });
  }

  const link = await sql`
    SELECT * FROM payment_links
    WHERE id = ${id} AND user_id = ${session.user.id}
    LIMIT 1
  `;

  if (link.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment link not found",
    });
  }

  const linkData = link[0];
  return successResponse({
    id: linkData.id,
    code: linkData.code,
    amount: Number(linkData.amount),
    currency: linkData.currency,
    description: linkData.description,
    status: linkData.status,
    expires_at: linkData.expires_at ? new Date(linkData.expires_at).toISOString() : null,
    payment_intent_id: linkData.payment_intent_id,
    url: `${process.env.APP_URL || ''}/pay/link/${linkData.code}`,
    created_at: new Date(linkData.created_at).toISOString(),
    updated_at: new Date(linkData.updated_at).toISOString(),
  });
});

/**
 * PATCH /api/payment-links/[id]
 * Update payment link (owner only, only if status is 'active')
 */
export const PATCH = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  if (!id || typeof id !== 'string') {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Payment link ID is required",
    });
  }

  // Check if link exists and belongs to user
  const existing = await sql`
    SELECT * FROM payment_links
    WHERE id = ${id} AND user_id = ${session.user.id}
    LIMIT 1
  `;

  if (existing.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment link not found",
    });
  }

  const linkData = existing[0];

  // Only allow updates if link is active
  if (linkData.status !== 'active') {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: `Cannot update payment link with status: ${linkData.status}`,
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON, {
      message: "Invalid JSON in request body",
    });
  }

  // Validate with Yup schema
  let validated;
  try {
    validated = await updatePaymentLinkSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (validationError) {
    if (validationError.name === "ValidationError") {
      const errors = {};
      if (validationError.inner && validationError.inner.length > 0) {
        validationError.inner.forEach((err) => {
          if (err.path) {
            errors[err.path] = err.message;
          }
        });
      } else if (validationError.path) {
        errors[validationError.path] = validationError.message;
      }

      return errorResponse(ErrorCodes.VALIDATION_ERROR, {
        message: "Validation failed",
        details: {
          errors,
          summary: validationError.message,
        },
      });
    }
    throw validationError;
  }

  // Update link
  const updated = await sql`
    UPDATE payment_links
    SET 
      description = ${validated.description !== undefined ? validated.description : linkData.description},
      expires_at = ${validated.expires_at !== undefined ? (validated.expires_at ? new Date(validated.expires_at) : null) : linkData.expires_at},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;

  const updatedLink = updated[0];
  return successResponse({
    id: updatedLink.id,
    code: updatedLink.code,
    amount: Number(updatedLink.amount),
    currency: updatedLink.currency,
    description: updatedLink.description,
    status: updatedLink.status,
    expires_at: updatedLink.expires_at ? new Date(updatedLink.expires_at).toISOString() : null,
    payment_intent_id: updatedLink.payment_intent_id,
    url: `${process.env.APP_URL || ''}/pay/link/${updatedLink.code}`,
    created_at: new Date(updatedLink.created_at).toISOString(),
    updated_at: new Date(updatedLink.updated_at).toISOString(),
  });
});

/**
 * DELETE /api/payment-links/[id]
 * Cancel payment link (owner only, only if status is 'active')
 */
export const DELETE = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  if (!id || typeof id !== 'string') {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: "Payment link ID is required",
    });
  }

  // Check if link exists and belongs to user
  const existing = await sql`
    SELECT * FROM payment_links
    WHERE id = ${id} AND user_id = ${session.user.id}
    LIMIT 1
  `;

  if (existing.length === 0) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Payment link not found",
    });
  }

  const linkData = existing[0];

  // Only allow cancellation if link is active
  if (linkData.status !== 'active') {
    return errorResponse(ErrorCodes.INVALID_STATUS, {
      message: `Cannot cancel payment link with status: ${linkData.status}`,
    });
  }

  // Update status to cancelled
  await sql`
    UPDATE payment_links
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = ${id}
  `;

  return successResponse({
    message: "Payment link cancelled successfully",
  });
});

