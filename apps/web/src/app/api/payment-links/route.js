import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";
import { normalizeCurrency } from "@/app/api/utils/currencies";

/**
 * Generate a short, URL-safe ID for payment links
 * @returns {string} 12-character code
 */
function generateLinkCode() {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

const createPaymentLinkSchema = yup.object({
  amount: CommonSchemas.amount,
  currency: CommonSchemas.currency,
  description: yup.string().max(500).nullable().default(null),
  expires_at: yup.date().nullable().default(null),
});

/**
 * GET /api/payment-links
 * List payment links for authenticated user
 * Query params: limit (default: 20), cursor (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);

  // Build query with pagination
  let query = sql`
    SELECT * FROM payment_links
    WHERE user_id = ${session.user.id}
  `;

  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  // Format response
  const formattedItems = items.map((link) => ({
    id: link.id,
    code: link.code,
    amount: Number(link.amount),
    currency: link.currency,
    description: link.description,
    status: link.status,
    expires_at: link.expires_at ? new Date(link.expires_at).toISOString() : null,
    payment_intent_id: link.payment_intent_id,
    url: `${process.env.APP_URL || ''}/pay/link/${link.code}`,
    created_at: new Date(link.created_at).toISOString(),
    updated_at: new Date(link.updated_at).toISOString(),
  }));

  return successResponse(createPaginationResponse(formattedItems, nextCursor, hasMore, limit));
});

/**
 * POST /api/payment-links
 * Create a new payment link
 * Body: { amount, currency, description?, expires_at? }
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
    return errorResponse(ErrorCodes.INVALID_JSON, {
      message: "Invalid JSON in request body",
    });
  }

  // Validate with Yup schema
  let validated;
  try {
    validated = await createPaymentLinkSchema.validate(body, {
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

  const currency = normalizeCurrency(validated.currency);
  
  // Generate unique code (retry if collision, extremely rare)
  let code = generateLinkCode();
  let existing = await sql`SELECT id FROM payment_links WHERE code = ${code} LIMIT 1`;
  let attempts = 0;
  while (existing.length > 0 && attempts < 5) {
    code = generateLinkCode();
    existing = await sql`SELECT id FROM payment_links WHERE code = ${code} LIMIT 1`;
    attempts++;
  }
  
  // Fallback: use timestamp-based code if still collision
  if (existing.length > 0) {
    code = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  const link = await sql`
    INSERT INTO payment_links (
      user_id, code, amount, currency, description, expires_at, status
    ) VALUES (
      ${session.user.id},
      ${code},
      ${validated.amount},
      ${currency},
      ${validated.description || null},
      ${validated.expires_at ? new Date(validated.expires_at) : null},
      'active'
    )
    RETURNING *
  `;

  const createdLink = link[0];
  const url = `${process.env.APP_URL || ''}/pay/link/${code}`;

  return successResponse(
    {
      id: createdLink.id,
      code: createdLink.code,
      amount: Number(createdLink.amount),
      currency: createdLink.currency,
      description: createdLink.description,
      status: createdLink.status,
      expires_at: createdLink.expires_at ? new Date(createdLink.expires_at).toISOString() : null,
      url,
      created_at: new Date(createdLink.created_at).toISOString(),
    },
    201
  );
});

