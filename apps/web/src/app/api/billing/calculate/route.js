import { auth } from "@/auth";
import { calculateFees } from "@/app/api/billing/_helpers";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";
import { normalizeCurrency } from "@/app/api/utils/currencies";

const calculateFeesSchema = yup.object({
  appliesTo: yup.string().required("appliesTo is required"),
  amount: CommonSchemas.amount,
  currency: CommonSchemas.currency,
  merchantId: yup.string().uuid().nullable().default(null),
  fundingPlan: yup.array().nullable().default(null),
});

/**
 * POST /api/billing/calculate
 * Calculate fees for a payment
 * Body: { appliesTo, amount, currency, merchantId?, fundingPlan? }
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
    validated = await calculateFeesSchema.validate(body, {
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
    const calc = await calculateFees({
      appliesTo: validated.appliesTo,
      amount: Number(validated.amount),
      currency: normalizeCurrency(validated.currency),
      merchantId: validated.merchantId,
      fundingPlan: validated.fundingPlan,
    });
    return successResponse(calc);
  } catch (error) {
    console.error("/api/billing/calculate POST error", error);
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Failed to calculate fees",
    });
  }
});
