import sql from "@/app/api/utils/sql";
import {
  successResponse,
  withErrorHandling,
} from "@/app/api/utils/errorHandler";
import { ensureAnyRole } from "@/app/api/middleware/roleGuard";
import { ROLES } from "@/utils/auth/roles";

/**
 * GET /api/kyc-verifier/pending
 * Get pending KYC verifications
 * Query params: type (all|individual|business)
 */
export const GET = withErrorHandling(async (request) => {
  const guard = await ensureAnyRole(request, [ROLES.KYC_VERIFIER, ROLES.ADMIN]);
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type') || 'all';

  // Get pending KYC verifications
  // Note: Assuming kyc_status is NULL or 'pending' for pending verifications
  let query = sql`
    SELECT 
      id,
      name,
      email,
      phone,
      kyc_status,
      kyc_type,
      created_at,
      updated_at
    FROM auth_users
    WHERE (kyc_status IS NULL OR kyc_status = 'pending')
  `;

  if (typeFilter === 'individual') {
    query = sql`${query} AND (kyc_type = 'individual' OR kyc_type IS NULL)`;
  } else if (typeFilter === 'business') {
    query = sql`${query} AND kyc_type = 'business'`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT 50`;

  const rows = await query;

  const items = rows.map((row) => {
    const submittedDate = new Date(row.created_at);
    const now = new Date();
    const diffMs = now.getTime() - submittedDate.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let submitted = '';
    if (diffHours < 24) {
      submitted = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      submitted = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    return {
      id: row.id,
      name: row.name || row.email?.split('@')[0] || 'User',
      type: row.kyc_type === 'business' ? 'Business' : 'Individual',
      docs: row.kyc_type === 'business' 
        ? 'Certificate of Incorporation' 
        : 'ID Card + Selfie',
      submitted,
    };
  });

  // Get stats
  const statsRows = await sql`
    SELECT 
      COUNT(*)::int AS pending,
      COUNT(*) FILTER (WHERE kyc_type = 'individual')::int AS individual,
      COUNT(*) FILTER (WHERE kyc_type = 'business')::int AS business
    FROM auth_users
    WHERE (kyc_status IS NULL OR kyc_status = 'pending')
  `;

  const stats = {
    pending: statsRows[0]?.pending || 0,
    individual: statsRows[0]?.individual || 0,
    business: statsRows[0]?.business || 0,
  };

  // Get approved/rejected counts for today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const todayStatsRows = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE kyc_status = 'verified' AND updated_at >= ${todayStart.toISOString()})::int AS approved_today,
      COUNT(*) FILTER (WHERE kyc_status = 'rejected' AND updated_at >= ${todayStart.toISOString()})::int AS rejected_today
    FROM auth_users
  `;

  const todayStats = {
    approvedToday: todayStatsRows[0]?.approved_today || 0,
    rejectedToday: todayStatsRows[0]?.rejected_today || 0,
  };

  // Get monthly count
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthStatsRows = await sql`
    SELECT COUNT(*)::int AS approved_month
    FROM auth_users
    WHERE kyc_status = 'verified' AND updated_at >= ${monthStart.toISOString()}
  `;

  return successResponse({
    items,
    stats: {
      ...stats,
      ...todayStats,
      thisMonth: monthStatsRows[0]?.approved_month || 0,
    },
  });
});

