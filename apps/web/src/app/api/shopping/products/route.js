import { auth } from "@/auth";
import { ProductService, ShopService } from "@/app/api/shopping/_services";
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
import sql from "@/app/api/utils/sql";

const createProductSchema = yup.object({
  shopId: yup.string().uuid().required("Shop ID is required"),
  name: yup.string().required("Product name is required"),
  description: yup.string().nullable().default(""),
  price: yup.number().positive().required("Price is required"),
  currency: CommonSchemas.currency,
  stock: yup.number().integer().min(0).nullable().default(null),
});

/**
 * GET /api/shopping/products
 * List products for a shop
 * Query params: shopId (required), limit (default: 20), cursor (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const { limit, cursor } = parsePaginationParams(searchParams);

  if (!shopId) {
    return errorResponse(ErrorCodes.MISSING_FIELDS, {
      message: "shopId is required",
    });
  }

  // Verify ownership
  const shop = await ShopService.getById(shopId);
  if (!shop || shop.merchant_user_id !== session.user.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Access denied to this shop",
    });
  }

  // Build query with pagination
  let query = sql`
    SELECT * FROM products
    WHERE shop_id = ${shopId}
  `;

  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  return successResponse(createPaginationResponse(items, nextCursor, hasMore, limit));
});

/**
 * POST /api/shopping/products
 * Create a new product
 * Body: { shopId, name, description?, price, currency?, stock? }
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
    validated = await createProductSchema.validate(body, {
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
        details: { errors, summary: validationError.message },
      });
    }
    throw validationError;
  }

  // Verify shop ownership
  const shop = await ShopService.getById(validated.shopId);
  if (!shop || shop.merchant_user_id !== session.user.id) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Access denied to this shop",
    });
  }

  const product = await ProductService.createProduct({
    shopId: validated.shopId,
    name: validated.name,
    description: validated.description || "",
    price: validated.price,
    currency: normalizeCurrency(validated.currency),
    stock: validated.stock,
  });

  return successResponse({ product }, 201);
});
