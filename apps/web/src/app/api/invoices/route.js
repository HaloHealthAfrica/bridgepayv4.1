import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
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

function isPrivileged(role) {
  return role === "admin" || role === "merchant";
}

function computeTotals(items = []) {
  let subtotal = 0;
  for (const it of items) {
    const qty = Number(it?.qty || 0);
    const price = Number(it?.price || 0);
    if (qty > 0 && price >= 0) subtotal += qty * price;
  }
  const tax = 0; // Phase 9: tax = 0 for now
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

const createInvoiceSchema = yup.object({
  customer_email: yup.string().email().nullable().default(null),
  customer_phone: yup.string().nullable().default(null),
  customer_name: yup.string().nullable().default(null),
  due_date: yup.date().nullable().default(null),
  currency: CommonSchemas.currency,
  items: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required(),
        qty: yup.number().positive().required(),
        price: yup.number().min(0).required(),
        description: yup.string().nullable().default(null),
      })
    )
    .min(1, "At least one item is required")
    .required(),
});

/**
 * POST /api/invoices
 * Create a new invoice
 * Body: { customer_email, customer_phone, customer_name, due_date, currency, items[] }
 */
export const POST = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/invoices[POST]" });
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  let role = session.user.role;
  if (!role) {
    try {
      const r =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isPrivileged(role)) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Merchant or admin access required",
      headers: reqMeta.header(),
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
    validated = await createInvoiceSchema.validate(body, {
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

  const currency = normalizeCurrency(validated.currency);
  const items = validated.items || [];
  const { subtotal, tax, total } = computeTotals(items);

  if (!(total > 0)) {
    return errorResponse(ErrorCodes.INVALID_AMOUNT, {
      message: "Invoice total must be greater than 0",
      headers: reqMeta.header(),
    });
  }

  const inserted = await sql`
    INSERT INTO invoices (
      customer_email, customer_phone, customer_name, due_date, currency, status, subtotal, tax, total
    ) VALUES (
      ${validated.customer_email || null},
      ${validated.customer_phone || null},
      ${validated.customer_name || null},
      ${validated.due_date ? new Date(validated.due_date) : null},
      ${currency},
      'draft',
      ${subtotal},
      ${tax},
      ${total}
    )
    RETURNING id
  `;
  const invoiceId = inserted?.[0]?.id;

  // Insert invoice items
  for (const it of items) {
    const qty = Number(it?.qty || 0);
    const price = Number(it?.price || 0);
    const line_total = qty * price;
    await sql`
      INSERT INTO invoice_items (
        invoice_id, name, qty, price, description, line_total
      ) VALUES (
        ${invoiceId},
        ${String(it?.name || "Item")},
        ${qty},
        ${price},
        ${it?.description || null},
        ${line_total}
      )
    `;
  }

  const hosted_url = `${process.env.APP_URL || ""}/i/${invoiceId}`;
  return successResponse(
    { id: invoiceId, total, hosted_url },
    201,
    reqMeta.header()
  );
});

/**
 * GET /api/invoices
 * List invoices for merchant/admin
 * Query params: limit (default: 20), cursor (optional)
 */
export const GET = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/invoices[GET]" });
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  let role = session.user.role;
  if (!role) {
    try {
      const r =
        await sql`SELECT role FROM auth_users WHERE id = ${session.user.id} LIMIT 1`;
      role = r?.[0]?.role;
    } catch {}
  }
  if (!isPrivileged(role)) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Merchant or admin access required",
      headers: reqMeta.header(),
    });
  }

  const { limit, cursor } = parsePaginationParams(new URL(request.url).searchParams);

  // Build query with pagination
  let query = sql`
    SELECT * FROM invoices
    WHERE 1=1
  `;
  
  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }
  
  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;
  
  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  return successResponse(
    createPaginationResponse(items, nextCursor, hasMore, limit),
    200,
    reqMeta.header()
  );
});
