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
 * POST /api/projects/[id]/milestones/[milestoneId]/verify
 * Verify/approve or reject a milestone (project verifier or admin)
 */
export const POST = withErrorHandling(async (request, { params: { id, milestoneId } }) => {
  const guard = await ensureAnyRole(request, [ROLES.PROJECT_VERIFIER, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }

  // Verify milestone exists and is in review
  const milestoneRows = await sql(
    `SELECT 
      m.id,
      m.project_id,
      m.status,
      m.amount,
      m.currency
     FROM project_milestones m
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
  if (milestone.status !== 'in_review') {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Milestone is not in review status",
    });
  }

  const body = await request.json();
  const { action, notes } = body; // action: 'approve' or 'reject'

  if (!action || !['approve', 'reject'].includes(action)) {
    return errorResponse(ErrorCodes.VALIDATION_ERROR, {
      message: "Action must be 'approve' or 'reject'",
    });
  }

  const newStatus = action === 'approve' ? 'completed' : 'rejected';
  const completedDate = action === 'approve' ? new Date().toISOString() : null;

  // Update milestone
  const rows = await sql(
    `UPDATE project_milestones 
     SET 
       status = $1,
       completed_date = $2,
       verifier_user_id = $3,
       verified_at = NOW(),
       verification_notes = $4,
       updated_at = NOW()
     WHERE id = $5 AND project_id = $6
     RETURNING *`,
    [newStatus, completedDate, guard.session.user.id, notes || null, milestoneId, id]
  );

  if (!rows || !rows[0]) {
    return errorResponse(ErrorCodes.NOT_FOUND, {
      message: "Milestone not found",
    });
  }

  // If approved, we might want to release escrow funds
  // This would be handled by a separate escrow release process
  // For now, we just update the milestone status

  return successResponse({ milestone: rows[0] });
});


