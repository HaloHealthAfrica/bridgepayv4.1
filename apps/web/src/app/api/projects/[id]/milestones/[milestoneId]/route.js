import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAnyRole } from "@/app/api/middleware/roleGuard";
import { ROLES } from "@/utils/auth/roles";

/**
 * GET /api/projects/[id]/milestones/[milestoneId]
 * Get a specific milestone
 */
export const GET = withErrorHandling(async (request, { params: { id, milestoneId } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  const rows = await sql(
    `SELECT 
      m.*,
      u.name AS verifier_name
     FROM project_milestones m
     LEFT JOIN auth_users u ON m.verifier_user_id = u.id
     WHERE m.id = $1 AND m.project_id = $2
     LIMIT 1`,
    [milestoneId, id]
  );

  if (!rows || !rows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Milestone not found",
    });
  }

  return successResponse({ milestone: rows[0] });
});

/**
 * PUT /api/projects/[id]/milestones/[milestoneId]
 * Update a milestone (project owner or admin)
 */
export const PUT = withErrorHandling(async (request, { params: { id, milestoneId } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Verify project exists and user is owner
  const projectRows = await sql(
    `SELECT id, user_id FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
    });
  }

  const project = projectRows[0];
  const isOwner = project.user_id === session.user.id;
  const isAdmin = session.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only project owner or admin can update milestones",
    });
  }

  const body = await request.json();
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (body.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(body.title);
  }
  if (body.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(body.description);
  }
  if (body.amount !== undefined) {
    updates.push(`amount = $${paramIndex++}`);
    values.push(body.amount);
  }
  if (body.currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`);
    values.push(body.currency);
  }
  if (body.due_date !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    values.push(body.due_date || null);
  }
  if (body.order_index !== undefined) {
    updates.push(`order_index = $${paramIndex++}`);
    values.push(body.order_index);
  }

  if (updates.length === 0) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "No fields to update",
    });
  }

  values.push(milestoneId, id);
  updates.push(`updated_at = NOW()`);

  const rows = await sql(
    `UPDATE project_milestones 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND project_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  if (!rows || !rows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Milestone not found",
    });
  }

  return successResponse({ milestone: rows[0] });
});

/**
 * DELETE /api/projects/[id]/milestones/[milestoneId]
 * Delete a milestone (project owner or admin)
 */
export const DELETE = withErrorHandling(async (request, { params: { id, milestoneId } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Verify project exists and user is owner
  const projectRows = await sql(
    `SELECT id, user_id FROM projects WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!projectRows || !projectRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Project not found",
    });
  }

  const project = projectRows[0];
  const isOwner = project.user_id === session.user.id;
  const isAdmin = session.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only project owner or admin can delete milestones",
    });
  }

  await sql(
    `DELETE FROM project_milestones WHERE id = $1 AND project_id = $2`,
    [milestoneId, id]
  );

  return successResponse({ message: "Milestone deleted" }, 200);
});


