import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { checkRateLimits } from "@/app/api/utils/ratelimit";
import { writeAudit } from "@/app/api/utils/audit";
import { recordMetric } from "@/app/api/utils/metrics";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";
import { normalizeCurrency } from "@/app/api/utils/currencies";

function isMerchant(role) {
  return role === "admin" || role === "merchant";
}

function shortId() {
  // short, URL-safe id
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}

const generateQRSchema = yup.object({
  mode: yup.string().oneOf(['pay', 'receive']).required("Mode is required"),
  amount: yup.number().positive().nullable().default(null),
  currency: CommonSchemas.currency,
  expiresIn: yup.number().integer().min(60).max(86400).default(900), // 15 minutes to 24 hours
  metadata: yup.object().nullable().default({}),
});

/**
 * POST /api/qr/generate
 * Generate QR code for payment
 * Body: { mode, amount?, currency?, expiresIn?, metadata? }
 */
export const POST = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/qr/generate" });
  const startedAt = Date.now();
  const session = await auth();
  let role = session?.user?.role || null;
  if (!role && session?.user?.id) {
    try {
      const r =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role || null;
    } catch {}
  }
  if (!session?.user?.id || !isMerchant(role)) {
    recordMetric({
      route: "qr.generate",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Merchant or admin access required",
      headers: reqMeta.header(),
    });
  }

  const rl = checkRateLimits({
    request,
    route: "qr.generate",
    rules: [
      { scope: "ip", limit: 30, burst: 30, windowMs: 60_000 },
      { scope: "user", limit: 10, burst: 10, windowMs: 60_000 },
    ],
  });
  if (!rl.allowed) {
    recordMetric({
      route: "qr.generate",
      durationMs: Date.now() - startedAt,
      error: true,
    });
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Rate limit exceeded",
      details: { retryAfter: rl.retryAfter },
      status: 429,
      headers: {
        ...reqMeta.header(),
        "Retry-After": String(rl.retryAfter),
      },
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse(ErrorCodes.INVALID_JSON, {
      message: "Invalid JSON in request body",
      headers: reqMeta.header(),
    });
  }

  // Validate with Yup schema
  let validated;
  try {
    validated = await generateQRSchema.validate(body, {
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
        headers: reqMeta.header(),
      });
    }
    throw validationError;
  }

  const code = shortId();
  const now = new Date();
  const expires_at = validated.expiresIn
    ? new Date(Date.now() + validated.expiresIn * 1000)
    : null;
  const currency = normalizeCurrency(validated.currency);
  const metadata = validated.metadata || {};

  await sql`
    INSERT INTO qr_codes (
      code, mode, amount, currency, status, expires_at, metadata, created_at, updated_at
    ) VALUES (
      ${code},
      ${validated.mode},
      ${validated.amount || null},
      ${currency},
      'active',
      ${expires_at},
      ${JSON.stringify({ ...metadata, creator_user_id: session.user.id })}::jsonb,
      NOW(),
      NOW()
    )
  `;

  await writeAudit({
    userId: session.user.id,
    action: "qr.generate",
    metadata: {
      correlationId: reqMeta.id,
      code,
      mode: validated.mode,
      amount: validated.amount,
      currency,
      expires_at,
    },
  });
  recordMetric({
    route: "qr.generate",
    durationMs: Date.now() - startedAt,
    error: false,
  });

  return successResponse(
    {
      code,
      status: "active",
      amount: validated.amount,
      currency,
      expires_at: expires_at ? expires_at.toISOString() : null,
      url: `${process.env.APP_URL || ""}/q/${code}`,
    },
    200,
    reqMeta.header()
  );
});
