import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import {
  errorResponse,
  successResponse,
  ErrorCodes,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAdmin } from "@/app/api/middleware/roleGuard";

/**
 * GET /api/analytics
 * Get platform analytics (admin only)
 * Supports date range filtering via query params: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAdmin(request);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Build date filter
  let dateFilter = "";
  const dateParams = [];
  if (startDate || endDate) {
    if (startDate && endDate) {
      dateFilter = "WHERE created_at >= $1 AND created_at <= $2";
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = "WHERE created_at >= $1";
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = "WHERE created_at <= $1";
      dateParams.push(endDate);
    }
  }

  // Get transaction volume
  const volumeQuery = dateFilter
    ? `SELECT COALESCE(SUM(amount), 0)::numeric AS total_volume, COUNT(*)::int AS transaction_count FROM wallet_ledger ${dateFilter}`
    : `SELECT COALESCE(SUM(amount), 0)::numeric AS total_volume, COUNT(*)::int AS transaction_count FROM wallet_ledger`;
  const volumeRows = await sql(volumeQuery, dateParams);

  // Get user growth
  const usersQuery = dateFilter
    ? `SELECT COUNT(*)::int AS total_users, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d FROM auth_users ${dateFilter.replace('created_at', 'created_at')}`
    : `SELECT COUNT(*)::int AS total_users, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS new_users_30d FROM auth_users`;
  const usersRows = await sql(usersQuery, dateParams.length > 0 ? dateParams : []);

  // Get active projects
  const projectsQuery = dateFilter
    ? `SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active_projects, COUNT(*)::int AS total_projects FROM projects ${dateFilter}`
    : `SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active_projects, COUNT(*)::int AS total_projects FROM projects`;
  const projectsRows = await sql(projectsQuery, dateParams);

  // Get revenue (from billing ledger)
  const revenueQuery = dateFilter
    ? `SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue FROM billing_ledger WHERE direction = 'IN' AND status = 'posted' ${dateFilter.replace('WHERE', 'AND')}`
    : `SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue FROM billing_ledger WHERE direction = 'IN' AND status = 'posted'`;
  const revenueRows = await sql(revenueQuery, dateParams.length > 0 ? dateParams : []);

  // Get payment success rate
  const paymentsQuery = dateFilter
    ? `SELECT 
        COUNT(*)::int AS total_payments,
        COUNT(*) FILTER (WHERE status = 'SETTLED')::int AS successful_payments
       FROM payment_intents ${dateFilter}`
    : `SELECT 
        COUNT(*)::int AS total_payments,
        COUNT(*) FILTER (WHERE status = 'SETTLED')::int AS successful_payments
       FROM payment_intents`;
  const paymentsRows = await sql(paymentsQuery, dateParams);

  const successRate =
    paymentsRows[0]?.total_payments > 0
      ? (paymentsRows[0]?.successful_payments / paymentsRows[0]?.total_payments) * 100
      : 0;

  // Get primary currency (most common in transactions)
  const currencyRows = await sql`
    SELECT currency, COUNT(*) as count
    FROM wallet_ledger
    ${dateFilter ? sql.unsafe(dateFilter.replace('created_at', 'created_at')) : sql``}
    GROUP BY currency
    ORDER BY count DESC
    LIMIT 1
  `;
  const primaryCurrency = currencyRows[0]?.currency || 'KES';

  // Get transaction volume over time (daily for last 30 days or date range)
  const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultEndDate = endDate || new Date().toISOString().split('T')[0];
  
  const transactionsOverTimeQuery = `
    SELECT 
      DATE_TRUNC('day', created_at)::date AS date,
      COUNT(*)::int AS count,
      COALESCE(SUM(amount), 0)::numeric AS volume
    FROM wallet_ledger
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
  `;
  const transactionsOverTimeRows = await sql(transactionsOverTimeQuery, [defaultStartDate, defaultEndDate]);

  // Get user growth over time
  const userGrowthQuery = `
    SELECT 
      DATE_TRUNC('day', created_at)::date AS date,
      COUNT(*)::int AS count
    FROM auth_users
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
  `;
  const userGrowthRows = await sql(userGrowthQuery, [defaultStartDate, defaultEndDate]);

  // Get revenue over time
  const revenueOverTimeQuery = `
    SELECT 
      DATE_TRUNC('day', created_at)::date AS date,
      COALESCE(SUM(amount), 0)::numeric AS revenue
    FROM billing_ledger
    WHERE direction = 'IN' AND status = 'posted' AND created_at >= $1 AND created_at <= $2
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date ASC
  `;
  const revenueOverTimeRows = await sql(revenueOverTimeQuery, [defaultStartDate, defaultEndDate]);

  return successResponse({
    transactionVolume: Number(volumeRows[0]?.total_volume || 0),
    transactionCount: volumeRows[0]?.transaction_count || 0,
    totalUsers: usersRows[0]?.total_users || 0,
    newUsers30d: usersRows[0]?.new_users_30d || 0,
    activeProjects: projectsRows[0]?.active_projects || 0,
    totalProjects: projectsRows[0]?.total_projects || 0,
    revenue: Number(revenueRows[0]?.total_revenue || 0),
    paymentSuccessRate: Math.round(successRate * 100) / 100,
    totalPayments: paymentsRows[0]?.total_payments || 0,
    successfulPayments: paymentsRows[0]?.successful_payments || 0,
    primaryCurrency,
    transactionsOverTime: transactionsOverTimeRows.map(row => ({
      date: row.date,
      count: row.count,
      volume: Number(row.volume || 0),
    })),
    userGrowth: userGrowthRows.map(row => ({
      date: row.date,
      count: row.count,
    })),
    revenueOverTime: revenueOverTimeRows.map(row => ({
      date: row.date,
      revenue: Number(row.revenue || 0),
    })),
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
  });
});


