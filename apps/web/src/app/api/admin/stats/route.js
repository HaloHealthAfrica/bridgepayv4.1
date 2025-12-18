import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  // Get total users
  const userCountRows = await sql`SELECT COUNT(*)::int AS count FROM auth_users`;
  const totalUsers = userCountRows[0]?.count || 0;

  // Get total transaction volume (from wallet ledger)
  const volumeRows = await sql`
    SELECT 
      currency,
      SUM(amount)::numeric AS total
    FROM wallet_ledger
    WHERE entry_type = 'credit' AND status = 'posted'
    GROUP BY currency
    ORDER BY SUM(amount) DESC
  `;
  const totalVolume = volumeRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const primaryCurrency = volumeRows[0]?.currency || 'KES';

  // Get active projects
  const activeProjectsRows = await sql`
    SELECT COUNT(*)::int AS count 
    FROM projects 
    WHERE status = 'active'
  `;
  const activeProjects = activeProjectsRows[0]?.count || 0;

  // Get transactions today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const transactionsTodayRows = await sql`
    SELECT COUNT(*)::int AS count
    FROM wallet_ledger
    WHERE created_at >= ${todayStart.toISOString()}
  `;
  const transactionsToday = transactionsTodayRows[0]?.count || 0;

  // Get escrow balance (from projects)
  const escrowRows = await sql`
    SELECT SUM(current_amount)::numeric AS total
    FROM projects
    WHERE status IN ('active', 'funding')
  `;
  const escrowBalance = Number(escrowRows[0]?.total || 0);

  // Get pending reviews (milestones in review)
  // TODO: When project_milestones table is created, uncomment this:
  // const pendingReviewsRows = await sql`
  //   SELECT COUNT(*)::int AS count
  //   FROM project_milestones
  //   WHERE status = 'in_review'
  // `;
  // const pendingReviews = pendingReviewsRows[0]?.count || 0;
  const pendingReviews = 0; // Placeholder until milestones table exists

  // Get recent activity (last 10 items)
  const recentActivityRows = await sql`
    SELECT 
      'user' AS type,
      'New user registration: ' || COALESCE(name, email) AS text,
      created_at AS time
    FROM auth_users
    ORDER BY created_at DESC
    LIMIT 5
    
    UNION ALL
    
    SELECT 
      'project' AS type,
      'Project created: ' || title AS text,
      created_at AS time
    FROM projects
    ORDER BY created_at DESC
    LIMIT 5
    
    ORDER BY time DESC
    LIMIT 10
  `;

  const recentActivity = recentActivityRows.map((row) => ({
    type: row.type,
    text: row.text,
    time: new Date(row.time).toISOString(),
  }));

  return successResponse({
    totalUsers,
    totalVolume,
    activeProjects,
    transactionsToday,
    escrowBalance,
    pendingReviews,
    currency: primaryCurrency,
    recentActivity,
  });
});

