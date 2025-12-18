import { auth } from "@/auth";
import { ShopService } from "@/app/api/shopping/_services";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";

const createShopSchema = yup.object({
  name: yup.string().required("Shop name is required"),
  description: yup.string().nullable().default(""),
});

/**
 * GET /api/shopping/shops
 * List shops for authenticated user
 */
export const GET = withErrorHandling(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  try {
    const shops = await ShopService.listMyShops(session.user.id);
    return successResponse({ shops });
  } catch (error) {
    console.error("/api/shopping/shops GET error", error);
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Failed to fetch shops",
    });
  }
});

/**
 * POST /api/shopping/shops
 * Create a new shop
 * Body: { name, description? }
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
    validated = await createShopSchema.validate(body, {
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
    const shop = await ShopService.createShop({
      merchantUserId: session.user.id,
      name: validated.name,
      description: validated.description || "",
    });
    return successResponse({ shop }, 201);
  } catch (error) {
    console.error("/api/shopping/shops POST error", error);
    return errorResponse(ErrorCodes.SERVER_ERROR, {
      message: "Failed to create shop",
    });
  }
});
