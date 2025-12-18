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
 * POST /api/projects/[id]/milestones/[milestoneId]/submit-evidence
 * Submit evidence for a milestone (implementer only)
 */
export const POST = withErrorHandling(async (request, { params: { id, milestoneId } }) => {
  const guard = await ensureAnyRole(request, [ROLES.IMPLEMENTER, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }

  // Verify milestone exists and project is assigned to implementer
  const milestoneRows = await sql(
    `SELECT 
      m.id,
      m.project_id,
      m.status,
      p.implementer_user_id,
      p.user_id AS project_owner_id
     FROM project_milestones m
     JOIN projects p ON m.project_id = p.id
     WHERE m.id = $1 AND m.project_id = $2
     LIMIT 1`,
    [milestoneId, id]
  );

  if (!milestoneRows || !milestoneRows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Milestone not found",
    });
  }

  const milestone = milestoneRows[0];
  const isAssignedImplementer = milestone.implementer_user_id === guard.session.user.id;
  const isAdmin = guard.session.user.role === ROLES.ADMIN;

  if (!isAssignedImplementer && !isAdmin) {
    return errorResponse(ErrorCodes.FORBIDDEN, {
      message: "Only assigned implementer can submit evidence",
    });
  }

  if (milestone.status === 'completed') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Milestone is already completed",
    });
  }

  const body = await request.json();
  const { evidence, evidence_metadata } = body;

  if (!evidence) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Evidence is required",
    });
  }

  // Update milestone status to 'in_review' and add evidence
  const rows = await sql(
    `UPDATE project_milestones 
     SET 
       evidence = $1,
       evidence_metadata = COALESCE($2::jsonb, '{}'::jsonb),
       status = 'in_review',
       updated_at = NOW()
     WHERE id = $3 AND project_id = $4
     RETURNING *`,
    [evidence, JSON.stringify(evidence_metadata || {}), milestoneId, id]
  );

  if (!rows || !rows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Milestone not found",
    });
  }

  return successResponse({ milestone: rows[0] });
});


