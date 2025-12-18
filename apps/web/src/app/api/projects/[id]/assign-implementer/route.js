import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ROLES } from "@/utils/auth/roles";

/**
 * POST /api/projects/[id]/assign-implementer
 * Assign an implementer to a project (project owner or admin)
 */
export const POST = withErrorHandling(async (request, { params: { id } }) => {
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
  const isAdmin = session.user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only project owner or admin can assign implementers",
    });
  }

  const body = await request.json();
  const { implementer_user_id } = body;

  if (!implementer_user_id) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "implementer_user_id is required",
    });
  }

  // Verify implementer user exists and has implementer role
  const implementerRows = await sql(
    `SELECT id, role FROM auth_users WHERE id = $1 LIMIT 1`,
    [implementer_user_id]
  );

  if (!implementerRows || !implementerRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Implementer user not found",
    });
  }

  const implementer = implementerRows[0];
  if (implementer.role !== ROLES.IMPLEMENTER && !isAdmin) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "User must have implementer role",
    });
  }

  // Update project
  const updatedRows = await sql(
    `UPDATE projects 
     SET implementer_user_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [implementer_user_id, id]
  );

  return successResponse({ project: updatedRows[0] });
});

/**
 * DELETE /api/projects/[id]/assign-implementer
 * Remove implementer assignment (project owner or admin)
 */
export const DELETE = withErrorHandling(async (request, { params: { id } }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(ErrorCodes.UNAUTHORIZED);
  }

  // Verify project exists
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
  const isAdmin = session.user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only project owner or admin can remove implementer assignment",
    });
  }

  // Remove implementer assignment
  const updatedRows = await sql(
    `UPDATE projects 
     SET implementer_user_id = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return successResponse({ project: updatedRows[0] });
});

