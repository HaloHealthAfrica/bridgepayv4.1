import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";

function isAdmin(role) {
  return role === "admin";
}

const createFeeSchema = yup.object({
  code: yup.string().required("Code is required"),
  name: yup.string().required("Name is required"),
  fee_type: yup.string().required("Fee type is required"),
  applies_to: yup.string().required("Applies to is required"),
  payer: yup.string().required("Payer is required"),
  amount: yup.number().nullable().default(null),
  rate: yup.number().nullable().default(null),
  tiers: yup.array().nullable().default(null),
  status: yup.string().default("active"),
  effective_start: yup.date().nullable().default(null),
  effective_end: yup.date().nullable().default(null),
  metadata: yup.object().default({}),
});

/**
 * GET /api/billing/fees
 * List all fee catalog entries (admin only)
 */
export const GET = withErrorHandling(async () => {
  const rows = await sql`
    SELECT 
      id, code, name, fee_type, applies_to, payer, amount, rate, tiers, 
      status, effective_start, effective_end, metadata, created_at, updated_at
    FROM billing_fee_catalog
    ORDER BY created_at DESC
  `;
  return successResponse({ fees: rows || [] });
});

/**
 * POST /api/billing/fees
 * Create or update fee catalog entry (admin only)
 * Body: { code, name, fee_type, applies_to, payer, amount?, rate?, tiers?, status?, effective_start?, effective_end?, metadata? }
 */
export const POST = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  let role = session?.user?.role;
  if (!role) {
    try {
      const r = await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isAdmin(role)) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Admin access required",
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
    validated = await createFeeSchema.validate(body, {
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

  try {
    const up = await sql`
      INSERT INTO billing_fee_catalog (
        code, name, fee_type, applies_to, payer, amount, rate, tiers, 
        status, effective_start, effective_end, metadata
      )
      VALUES (
        ${String(validated.code)},
        ${String(validated.name)},
        ${String(validated.fee_type)},
        ${String(validated.applies_to)},
        ${String(validated.payer)},
        ${validated.amount == null ? null : Number(validated.amount)},
        ${validated.rate == null ? null : Number(validated.rate)},
        ${validated.tiers ? JSON.stringify(validated.tiers) : JSON.stringify([])}::jsonb,
        ${String(validated.status)},
        ${validated.effective_start || null},
        ${validated.effective_end || null},
        ${JSON.stringify(validated.metadata || {})}::jsonb
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        fee_type = EXCLUDED.fee_type,
        applies_to = EXCLUDED.applies_to,
        payer = EXCLUDED.payer,
        amount = EXCLUDED.amount,
        rate = EXCLUDED.rate,
        tiers = EXCLUDED.tiers,
        status = EXCLUDED.status,
        effective_start = EXCLUDED.effective_start,
        effective_end = EXCLUDED.effective_end,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;
    return successResponse({ fee: up?.[0] });
  } catch (error) {
    console.error("/api/billing/fees POST error", error);
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Failed to create/update fee",
    });
  }
});
