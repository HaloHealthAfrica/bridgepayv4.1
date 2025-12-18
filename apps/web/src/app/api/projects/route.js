import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { startRequest } from "@/app/api/utils/logger";
import { writeAudit } from "@/app/api/utils/audit";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import * as yup from "yup";
import { CommonSchemas } from "@/app/api/middleware/validate";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";

/**
 * GET /api/projects
 * List projects for the authenticated user
 * Query params: status (all|draft|active|completed|cancelled), q (search query)
 */
export const GET = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/projects[GET]" });
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "all";
  const searchQuery = searchParams.get("q") || "";
  const { limit, cursor } = parsePaginationParams(searchParams);

  // Validate status filter
  const validStatuses = ["all", "draft", "active", "completed", "cancelled"];
  if (!validStatuses.includes(statusFilter)) {
    return errorResponse(ErrorCodes.INVALID_INPUT, {
      message: `Status must be one of: ${validStatuses.join(", ")}`,
      headers: reqMeta.header(),
    });
  }

  // Build query with pagination
  let query = sql`
    SELECT 
      id,
      user_id,
      title,
      description,
      status,
      current_amount,
      target_amount,
      currency,
      deadline,
      category,
      location,
      cover_image_url,
      created_at,
      updated_at
    FROM projects
    WHERE user_id = ${session.user.id}
  `;

  // Apply status filter
  if (statusFilter !== "all") {
    query = sql`${query} AND status = ${statusFilter}`;
  }

  // Apply search query
  if (searchQuery) {
    const searchPattern = `%${searchQuery}%`;
    query = sql`${query} AND (
      title ILIKE ${searchPattern} OR
      description ILIKE ${searchPattern} OR
      category ILIKE ${searchPattern}
    )`;
  }

  // Apply cursor pagination
  if (cursor) {
    query = sql`${query} AND created_at < ${new Date(cursor)}`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit + 1}`;

  const rows = await query;

  const { items: rawItems, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  const items = rawItems.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || null,
    status: row.status || "draft",
    current_amount: Number(row.current_amount || 0),
    target_amount: Number(row.target_amount || 0),
    currency: row.currency || "KES",
    deadline: row.deadline ? new Date(row.deadline).toISOString().split("T")[0] : null,
    category: row.category || null,
    location: row.location || null,
    cover_image_url: row.cover_image_url || null,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  }));

  return successResponse(
    createPaginationResponse(items, nextCursor, hasMore, limit),
    200,
    reqMeta.header()
  );
});

// Validation schema for project creation
const createProjectSchema = yup.object({
  title: yup
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be no more than 200 characters")
    .required("Title is required"),
  description: CommonSchemas.optionalString.max(5000, "Description must be no more than 5000 characters"),
  target_amount: yup
    .number()
    .typeError("Target amount must be a number")
    .min(0, "Target amount must be greater than or equal to 0")
    .required("Target amount is required"),
  currency: CommonSchemas.currency,
  deadline: yup
    .date()
    .typeError("Deadline must be a valid date")
    .min(new Date(), "Deadline must be a future date")
    .nullable()
    .default(null),
  category: CommonSchemas.optionalString.max(100, "Category must be no more than 100 characters"),
  location: CommonSchemas.optionalString.max(200, "Location must be no more than 200 characters"),
  cover_image_url: yup
    .string()
    .url("Cover image URL must be a valid URL")
    .nullable()
    .default(null),
});

/**
 * POST /api/projects
 * Create a new project
 * Body: { title, description, target_amount, currency, deadline, category, location, cover_image_url }
 */
export const POST = withErrorHandling(async (request) => {
  const reqMeta = startRequest({ request, route: "/api/projects[POST]" });
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED, {
      headers: reqMeta.header(),
    });
  }

  // Parse and validate request body
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
    validated = await createProjectSchema.validate(body, {
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

  // Insert project
  const result = await sql(
    `INSERT INTO projects (
      user_id,
      title,
      description,
      status,
      target_amount,
      currency,
      deadline,
      category,
      location,
      cover_image_url,
      current_amount
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, title, description, status, target_amount, currency, deadline, category, location, cover_image_url, current_amount, created_at`,
    [
      session.user.id,
      validated.title,
      validated.description || null,
      "draft", // Default status
      validated.target_amount,
      validated.currency,
      validated.deadline ? new Date(validated.deadline).toISOString() : null,
      validated.category || null,
      validated.location || null,
      validated.cover_image_url || null,
      0, // Start with 0 current_amount
    ]
  );

  const project = result[0];

  await writeAudit({
    userId: session.user.id,
    action: "projects.create",
    metadata: { projectId: project.id, correlationId: reqMeta.id },
  });

  return successResponse(
    {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      target_amount: Number(project.target_amount || 0),
      currency: project.currency,
      deadline: project.deadline
        ? new Date(project.deadline).toISOString().split("T")[0]
        : null,
      category: project.category,
      location: project.location,
      cover_image_url: project.cover_image_url,
      current_amount: Number(project.current_amount || 0),
      created_at: project.created_at ? new Date(project.created_at).toISOString() : null,
    },
    200,
    reqMeta.header()
  );
});

