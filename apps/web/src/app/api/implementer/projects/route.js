import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAnyRole } from "@/app/api/middleware/roleGuard";
import { ROLES } from "@/utils/auth/roles";

/**
 * GET /api/implementer/projects
 * Get projects assigned to implementer
 * Note: This assumes projects have an implementer_user_id field or similar
 * For now, we'll return projects where the user is not the owner
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAnyRole(request, [ROLES.IMPLEMENTER, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }

  // Get active projects assigned to this implementer
  const projectsRows = await sql`
    SELECT 
      p.id,
      p.title,
      p.status,
      p.current_amount,
      p.target_amount,
      p.currency,
      p.deadline,
      p.implementer_user_id,
      u.name AS owner_name,
      u.email AS owner_email
    FROM projects p
    LEFT JOIN auth_users u ON p.user_id = u.id
    WHERE p.status = 'active' 
      AND p.implementer_user_id = ${guard.session.user.id}
    ORDER BY p.created_at DESC
    LIMIT 20
  `;

  const items = projectsRows.map((row) => {
    const progress = row.target_amount > 0
      ? Math.round((Number(row.current_amount || 0) / Number(row.target_amount || 1)) * 100)
      : 0;

    // Calculate days until deadline
    let due = '';
    if (row.deadline) {
      const deadline = new Date(row.deadline);
      const now = new Date();
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      if (diffDays < 0) {
        due = 'Overdue';
      } else if (diffDays < 7) {
        due = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      } else {
        const weeks = Math.floor(diffDays / 7);
        due = `${weeks} week${weeks !== 1 ? 's' : ''}`;
      }
    } else {
      due = 'No deadline';
    }

        return {
          id: row.id,
          title: row.title,
          client: row.owner_name || row.owner_email?.split('@')[0] || 'Client',
          progress,
          escrow: Number(row.current_amount || 0),
          currency: row.currency || 'KES',
          due,
        };
  });

  // Get stats
  const statsRows = await sql`
    SELECT 
      COUNT(*)::int AS active_projects
    FROM projects
    WHERE status = 'active'
  `;

  // Get milestone stats
  const milestoneStatsRows = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'in_review')::int AS pending_milestones,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_date >= NOW() - INTERVAL '1 month')::int AS completed_this_month,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND completed_date >= NOW() - INTERVAL '1 month'), 0)::numeric AS earned_this_month
    FROM project_milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE p.implementer_user_id = ${guard.session.user.id}
      AND p.status = 'active'
  `;

  // Get primary currency from projects (most common currency)
  const currencyRows = await sql`
    SELECT currency, COUNT(*) as count
    FROM projects
    WHERE status = 'active'
      AND implementer_user_id = ${guard.session.user.id}
    GROUP BY currency
    ORDER BY count DESC
    LIMIT 1
  `;
  const primaryCurrency = currencyRows[0]?.currency || 'KES';

  const stats = {
    activeProjects: statsRows[0]?.active_projects || 0,
    pendingMilestones: milestoneStatsRows[0]?.pending_milestones || 0,
    completedThisMonth: milestoneStatsRows[0]?.completed_this_month || 0,
    earnedThisMonth: milestoneStatsRows[0]?.earned_this_month || 0,
    currency: primaryCurrency,
  };

  return successResponse({
    items,
    stats,
  });
});

