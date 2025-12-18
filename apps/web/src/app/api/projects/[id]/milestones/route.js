import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { parsePaginationParams, createPaginationResponse, processPaginatedResults } from "@/app/api/utils/pagination";

/**
 * GET /api/projects/[id]/milestones
 * Get milestones for a project
 */
export const GET = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Verify project exists
  const projectRows = await sql(
    `SELECT id, user_id, status FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
    });
  }

  const project = projectRows[0];
  const isOwner = project.user_id === session.user.id;
  const userRole = session.user.role || 'customer';

  // Get milestones
  const { searchParams } = new URL(request.url);
  const { limit, cursor } = parsePaginationParams(searchParams);

  let query = sql`
    SELECT 
      m.id,
      m.project_id,
      m.title,
      m.description,
      m.amount,
      m.currency,
      m.status,
      m.due_date,
      m.completed_date,
      m.evidence,
      m.evidence_metadata,
      m.verifier_user_id,
      m.verified_at,
      m.verification_notes,
      m.order_index,
      m.created_at,
      m.updated_at,
      u.name AS verifier_name
    FROM project_milestones m
    LEFT JOIN auth_users u ON m.verifier_user_id = u.id
    WHERE m.project_id = ${id}
  `;

  if (cursor) {
    query = sql`${query} AND m.created_at < ${cursor}`;
  }

  query = sql`${query} ORDER BY m.order_index ASC, m.created_at ASC LIMIT ${limit + 1}`;

  const rows = await query;
  const { items, cursor: nextCursor, hasMore } = processPaginatedResults(rows, limit);

  return successResponse(
    createPaginationResponse(items, nextCursor, hasMore, limit)
  );
});

/**
 * POST /api/projects/[id]/milestones
 * Create a new milestone for a project (project owner only)
 */
export const POST = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Verify project exists and user is owner
  const projectRows = await sql(
    `SELECT id, user_id, status FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
    });
  }

  const project = projectRows[0];
  if (project.user_id !== session.user.id && session.user.role !== 'admin') {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only project owner can create milestones",
    });
  }

  const body = await request.json();
  const { title, description, amount, currency = 'KES', due_date, order_index = 0 } = body;

  if (!title || !amount) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Title and amount are required",
    });
  }

  // Get next order_index if not provided
  let finalOrderIndex = order_index;
  if (!order_index) {
    const maxOrderRows = await sql(
      `SELECT COALESCE(MAX(order_index), 0) + 1 AS next_index FROM project_milestones WHERE project_id = $1`,
      [id]
    );
    finalOrderIndex = maxOrderRows[0]?.next_index || 1;
  }

  const rows = await sql(
    `INSERT INTO project_milestones 
     (project_id, title, description, amount, currency, due_date, order_index, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [id, title, description || null, amount, currency, due_date || null, finalOrderIndex]
  );

  return successResponse({ milestone: rows[0] }, 201);
});
