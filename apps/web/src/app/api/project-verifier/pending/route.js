import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAnyRole } from "@/app/api/middleware/roleGuard";
import { ROLES } from "@/utils/auth/roles";

/**
 * GET /api/project-verifier/pending
 * Get pending milestones for verification
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAnyRole(request, [ROLES.PROJECT_VERIFIER, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }

  // Get pending milestones for review
  const milestoneRows = await sql`
    SELECT 
      m.id,
      m.project_id,
      m.title,
      m.description,
      m.amount,
      m.currency,
      m.status,
      m.due_date,
      m.evidence,
      m.evidence_metadata,
      m.created_at,
      p.title AS project_title,
      u.name AS implementer_name,
      u.email AS implementer_email
    FROM project_milestones m
    JOIN projects p ON m.project_id = p.id
    LEFT JOIN auth_users u ON p.implementer_user_id = u.id
    WHERE m.status = 'in_review'
    ORDER BY m.created_at DESC
    LIMIT 50
  `;

  const items = milestoneRows.map(row => ({
    id: row.id,
    projectId: row.project_id,
    projectTitle: row.project_title,
    title: row.title,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    dueDate: row.due_date,
    evidence: row.evidence,
    evidenceMetadata: row.evidence_metadata,
    implementerName: row.implementer_name || row.implementer_email?.split('@')[0] || 'Unknown',
    createdAt: row.created_at,
  }));

  // Get stats
  const statsRows = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'in_review')::int AS pending_reviews,
      COUNT(*) FILTER (WHERE status = 'completed' AND verified_at >= NOW() - INTERVAL '7 days')::int AS approved_this_week,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::numeric AS value_verified,
      COUNT(DISTINCT project_id) FILTER (WHERE status = 'active')::int AS active_projects
    FROM project_milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE p.status = 'active'
  `;

  const activeProjectsRows = await sql`
    SELECT COUNT(*)::int AS count 
    FROM projects 
    WHERE status = 'active'
  `;

      // Get primary currency from milestones
      const currencyRows = await sql`
        SELECT currency, COUNT(*) as count
        FROM project_milestones
        GROUP BY currency
        ORDER BY count DESC
        LIMIT 1
      `;
      const primaryCurrency = currencyRows[0]?.currency || 'KES';

      const stats = {
        pendingReviews: statsRows[0]?.pending_reviews || 0,
        approvedThisWeek: statsRows[0]?.approved_this_week || 0,
        valueVerified: Number(statsRows[0]?.value_verified || 0),
        activeProjects: activeProjectsRows[0]?.count || 0,
        currency: primaryCurrency,
      };

  return successResponse({
    items,
    stats,
  });
});

